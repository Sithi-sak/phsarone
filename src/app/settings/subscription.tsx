import { useAuth } from "@clerk/clerk-expo";
import { getAuthToken } from "@src/lib/auth";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { useCurrentSubscription } from "@src/hooks/useCurrentSubscription";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Href, Stack, useFocusEffect, useRouter } from "expo-router";
import { ActivityIndicator, Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaretLeftIcon } from "phosphor-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const { subscription, entitlements, loading, refresh } =
    useCurrentSubscription();
  const [isCanceling, setIsCanceling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const durationLabel = useMemo(() => {
    if (!subscription?.current_period_end) return "-";
    const now = Date.now();
    const end = new Date(subscription.current_period_end).getTime();
    if (Number.isNaN(end)) return "-";
    const diffDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return t("subscription_settings.expired");
    return t("subscription_settings.days_left", { count: diffDays });
  }, [subscription?.current_period_end, t]);

  const currentPlanId = entitlements.planType;
  const isActive = entitlements.isSubscriptionActive;

  const recommendedPlan = useMemo<PlanId>(() => {
    if (currentPlanId === "starter") return "pro";
    if (currentPlanId === "pro") return "business";
    if (currentPlanId === "business") return "business";
    return "starter";
  }, [currentPlanId]);

  const ctaLabel = useMemo(() => {
    if (!subscription || !isActive) return t("subscription_settings.choose_plan");
    if (currentPlanId === "business") return t("subscription_settings.manage_plan");
    return t("subscription_settings.upgrade_plan");
  }, [currentPlanId, isActive, subscription, t]);

  const canCancel = useMemo(() => {
    return (
      !!subscription &&
      !isCanceling &&
      currentPlanId !== "regular" &&
      String(subscription.status || "").toLowerCase() !== "canceled" &&
      !!subscription.current_period_end &&
      new Date(subscription.current_period_end).getTime() > Date.now()
    );
  }, [currentPlanId, isCanceling, subscription]);

  const cancelSubscription = useCallback(() => {
    if (!subscription?.id || isCanceling) return;

    Alert.alert(
      t("subscription_settings.cancel_title"),
      t("subscription_settings.cancel_description"),
      [
        { text: t("subscription_settings.keep_plan"), style: "cancel" },
        {
          text: t("subscription_settings.cancel_subscription"),
          style: "destructive",
          onPress: async () => {
            try {
              setIsCanceling(true);
              const token = await getAuthToken(
                getToken,
                "subscription cancellation",
              );
              const authSupabase = createClerkSupabaseClient(token);
              const { error } = await authSupabase
                .from("subscriptions")
                .update({ status: "canceled" })
                .eq("id", subscription.id);

              if (error) throw error;

              await refresh();
              Alert.alert(
                t("subscription_settings.canceled_title"),
                t("subscription_settings.canceled_description"),
              );
            } catch (cancelError) {
              console.error("Error canceling subscription:", cancelError);
              Alert.alert(
                t("subscription_settings.cancellation_failed"),
                cancelError instanceof Error
                  ? cancelError.message
                  : t("subscription_settings.unable_to_cancel"),
              );
            } finally {
              setIsCanceling(false);
            }
          },
        },
      ],
    );
  }, [getToken, isCanceling, refresh, subscription?.id, t]);

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
        <ThemedText style={styles.headerTitle}>{t("subscription_settings.title")}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={themeColors.primary} />
              <ThemedText style={styles.loadingText}>
                {t("subscription_settings.loading")}
              </ThemedText>
            </View>
          ) : subscription ? (
            <>
              <Row
                label={t("subscription_settings.current_plan")}
                value={`${formatPlan(subscription.plan_type)} ${t("subscription_settings.plan_suffix")}`}
              />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row label={t("subscription_settings.status")} value={formatStatus(subscription.status)} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row
                label={t("subscription_settings.valid_until")}
                value={formatDate(subscription.current_period_end)}
              />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row label={t("subscription_settings.duration")} value={durationLabel} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row
                label={t("subscription_settings.payment_provider")}
                value={String(subscription.payment_provider || "-").toUpperCase()}
              />
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <ThemedText style={styles.emptyTitle}>
                {t("subscription_settings.no_subscription")}
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                {t("subscription_settings.no_subscription_description")}
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

        {canCancel ? (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={cancelSubscription}
            activeOpacity={0.8}
            disabled={isCanceling}
          >
            <ThemedText style={styles.secondaryButtonText}>
              {isCanceling
                ? t("subscription_settings.canceling")
                : t("subscription_settings.cancel_subscription")}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
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
  secondaryButton: {
    alignItems: "center",
    borderColor: "#D1D5DB",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  secondaryButtonText: {
    color: "#991B1B",
    fontSize: 15,
    fontWeight: "600",
  },
});
