import { useAuth } from "@clerk/clerk-expo";
import { getAuthToken } from "@src/lib/auth";
import {
  Entitlements,
  getEntitlements,
  SubscriptionRow,
} from "@src/lib/entitlements";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

export function useCurrentSubscription() {
  const { userId, getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements>(
    getEntitlements(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setEntitlements(getEntitlements());
      setLoading(false);
      setError(null);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken(
        getTokenRef.current,
        "current subscription fetch",
      );

      const authSupabase = createClerkSupabaseClient(token);
      const { data: activeData, error: activeError } = await authSupabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "trailing", "past_due", "canceled"])
        .order("current_period_end", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(10);

      if (activeError) throw activeError;

      const resolvedActive = ((activeData as SubscriptionRow[] | null) ?? []).find(
        (row) => getEntitlements({ subscription: row }).isSubscriptionActive,
      );

      if (resolvedActive) {
        const resolved = resolvedActive;
        setSubscription(resolved);
        setEntitlements(getEntitlements({ subscription: resolved }));
        return resolved;
      }

      const { data, error: fallbackError } = await authSupabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError) throw fallbackError;

      const resolved = (data as SubscriptionRow | null) ?? null;
      setSubscription(resolved);
      setEntitlements(getEntitlements({ subscription: resolved }));
      return resolved;
    } catch (fetchError) {
      console.warn("Current subscription fetch warning:", fetchError);
      setSubscription(null);
      setEntitlements(getEntitlements());
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load subscription.",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    loading,
    subscription,
    entitlements,
    error,
    refresh,
  };
}
