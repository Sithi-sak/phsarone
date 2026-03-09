import { useAuth } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Database } from "@src/types/supabase";
import { Href, Stack, useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretLeftIcon } from "phosphor-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

type PlanId = "starter" | "pro" | "business";

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPlan(planType: string | null) {
  const value = String(planType || "regular").toLowerCase();
  if (value === "starter") return "Starter";
  if (value === "pro") return "Pro";
  if (value === "business") return "Business";
  return "Regular";
}

function formatStatus(status: string | null) {
  const value = String(status || "inactive").toLowerCase();
  if (value === "active") return "Active";
  if (value === "canceled") return "Canceled";
  if (value === "past_due") return "Past Due";
  if (value === "pending_verification") return "Pending Verification";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function SubscriptionSettingsScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { userId, getToken } = useAuth();

  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);

  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchSubscription = useCallback(async () => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = await getTokenRef.current({});
      if (!token) throw new Error("Missing auth token.");

      const authSupabase = createClerkSupabaseClient(token);
      const { data, error } = await authSupabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription((data as SubscriptionRow | null) ?? null);
    } catch (error) {
      console.error("Error loading subscription settings:", error);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchSubscription();
    }, [fetchSubscription]),
  );

  const durationLabel = useMemo(() => {
    if (!subscription?.current_period_end) return "-";
    const now = Date.now();
    const end = new Date(subscription.current_period_end).getTime();
    if (Number.isNaN(end)) return "-";
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "Expired";
    return `${diffDays} day${diffDays === 1 ? "" : "s"} left`;
  }, [subscription?.current_period_end]);

  const currentPlanId = String(subscription?.plan_type || "").toLowerCase();
  const isActive = String(subscription?.status || "").toLowerCase() === "active";

  const recommendedPlan = useMemo<PlanId>(() => {
    if (currentPlanId === "starter") return "pro";
    if (currentPlanId === "pro") return "business";
    if (currentPlanId === "business") return "business";
    return "starter";
  }, [currentPlanId]);

  const ctaLabel = useMemo(() => {
    if (!subscription || !isActive) return "Choose Plan";
    if (currentPlanId === "business") return "Manage Plan";
    return "Upgrade Plan";
  }, [currentPlanId, isActive, subscription]);

  const Row = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={styles.rowValue}>{value}</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Subscription</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={themeColors.primary} />
              <ThemedText style={styles.loadingText}>Loading subscription...</ThemedText>
            </View>
          ) : subscription ? (
            <>
              <Row label="Current plan" value={`${formatPlan(subscription.plan_type)} Plan`} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row label="Status" value={formatStatus(subscription.status)} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row label="Valid until" value={formatDate(subscription.current_period_end)} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row label="Duration" value={durationLabel} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row
                label="Payment provider"
                value={String(subscription.payment_provider || "-").toUpperCase()}
              />
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <ThemedText style={styles.emptyTitle}>No subscription found</ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Subscribe to unlock higher-tier features.
              </ThemedText>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: themeColors.primary }]}
          onPress={() =>
            router.push({
              pathname: "/subscription" as Href,
              params: { plan: recommendedPlan },
            })
          }
          activeOpacity={0.8}
        >
          <ThemedText style={styles.actionButtonText}>{ctaLabel}</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 60,
    paddingHorizontal: 14,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.8,
  },
  separator: {
    height: 1,
    marginHorizontal: 14,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    minHeight: 220,
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 13,
    opacity: 0.72,
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
    opacity: 0.72,
    textAlign: "center",
  },
  actionButton: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 52,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
