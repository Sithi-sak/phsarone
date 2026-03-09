import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@20.4.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY);

const PLAN_DURATION_DAYS: Record<string, number> = {
  starter: 30,
  pro: 30,
  business: 30,
};

function jsonResponse(status: number, data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function getUserIdFromRequest(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.split(" ")[1];
  if (!token) return null;

  try {
    const [, payload] = token.split(".");
    if (!payload) return null;

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(atob(normalized));

    return typeof decodedPayload.sub === "string" ? decodedPayload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "method_not_allowed" });
  }

  if (!STRIPE_SECRET_KEY) {
    return jsonResponse(500, {
      error: "Stripe secret key is missing. Set STRIPE_SECRET_KEY.",
    });
  }

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return jsonResponse(401, { error: "missing_or_invalid_auth" });
  }

  const body = await req.json().catch(() => ({}));
  const paymentIntentId = String(body?.paymentIntentId || "");

  if (!paymentIntentId) {
    return jsonResponse(400, { error: "missing_payment_intent_id" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      return jsonResponse(400, { error: "payment_not_succeeded" });
    }

    const metadataUserId = String(paymentIntent.metadata?.user_id || "");
    if (metadataUserId && metadataUserId !== userId) {
      return jsonResponse(403, { error: "payment_user_mismatch" });
    }

    const requestedPlanId = String(body?.planId || "").toLowerCase();
    const metadataPlanId = String(paymentIntent.metadata?.plan_id || "").toLowerCase();
    const planId = requestedPlanId || metadataPlanId;

    if (!PLAN_DURATION_DAYS[planId]) {
      return jsonResponse(400, { error: "invalid_plan" });
    }

    const nowIso = new Date().toISOString();
    const periodEnd = new Date(
      Date.now() + PLAN_DURATION_DAYS[planId] * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error: deactivateError } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: nowIso,
      })
      .eq("user_id", userId)
      .in("status", ["active", "trailing", "past_due"]);

    if (deactivateError) {
      return jsonResponse(500, { error: deactivateError.message });
    }

    const { data: subscription, error: upsertError } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          plan_type: planId,
          status: "active",
          payment_provider: "stripe",
          external_id: paymentIntent.id,
          current_period_end: periodEnd,
          updated_at: nowIso,
        },
        {
          onConflict: "external_id",
        },
      )
      .select("*")
      .single();

    if (upsertError) {
      return jsonResponse(500, { error: upsertError.message });
    }

    return jsonResponse(200, {
      success: true,
      subscription,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "confirm_payment_failed";
    return jsonResponse(500, { error: message });
  }
});
