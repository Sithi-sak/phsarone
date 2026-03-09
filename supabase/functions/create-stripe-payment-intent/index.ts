import Stripe from "npm:stripe@20.4.1";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const stripe = new Stripe(STRIPE_SECRET_KEY);

const PLAN_PRICING: Record<
  string,
  {
    amount: number;
    currency: string;
  }
> = {
  starter: { amount: 499, currency: "usd" },
  pro: { amount: 1499, currency: "usd" },
  business: { amount: 2999, currency: "usd" },
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
  const planId = String(body?.planId || "").toLowerCase();
  const plan = PLAN_PRICING[planId];

  if (!plan) {
    return jsonResponse(400, { error: "invalid_plan" });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.amount,
      currency: plan.currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
    });

    return jsonResponse(200, {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      planId,
      amount: plan.amount,
      currency: plan.currency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "stripe_error";
    return jsonResponse(500, { error: message });
  }
});
