import AnalyticsLockedCard from "@src/components/dashboard_components/AnalyticsLockedCard";
import DashboardHeader from "@src/components/dashboard_components/DashboardHeader";
import InterestsDonutChart from "@src/components/dashboard_components/InterestsDonutChart";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useCurrentSubscription } from "@src/hooks/useCurrentSubscription";
import { useDashboardAnalytics } from "@src/hooks/useDashboardAnalytics";
import useThemeColor from "@src/hooks/useThemeColor";
import { Stack } from "expo-router";
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export default function DashboardInsightScreen() {
  const themeColors = useThemeColor();
  const {
    entitlements,
    loading: subscriptionLoading,
    refresh: refreshSubscription,
  } = useCurrentSubscription();
  const canAccess = entitlements.hasAdvancedAnalytics;
  const { data, error, loading } = useDashboardAnalytics(canAccess);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const funnelSteps = useMemo(
    () => [
      { color: "#2563EB", label: "Views", value: data.performance.listingViews },
      { color: "#D9382C", label: "Saves", value: data.performance.savedItems },
      { color: "#16A34A", label: "Chats", value: data.performance.chatStarts },
    ],
    [data.performance.chatStarts, data.performance.listingViews, data.performance.savedItems],
  );

  const funnelBase = Math.max(...funnelSteps.map((step) => step.value), 1);

  const conversionClues = useMemo(
    () => [
      {
        key: "save-rate",
        label: "Save intent",
        value: `${pct(data.performance.savedItems, data.performance.listingViews)}%`,
        note: "of views convert into saves",
      },
      {
        key: "chat-from-views",
        label: "Chat start rate",
        value: `${pct(data.performance.chatStarts, data.performance.listingViews)}%`,
        note: "of views become chat starts",
      },
      {
        key: "chat-from-saves",
        label: "Save to chat",
        value: `${pct(data.performance.chatStarts, data.performance.savedItems)}%`,
        note: "of saves become chat starts",
      },
    ],
    [data.performance.chatStarts, data.performance.listingViews, data.performance.savedItems],
  );

  const rankedSegments = useMemo(
    () => [...data.insights.segments].sort((a, b) => b.value - a.value),
    [data.insights.segments],
  );

  const topSegments = rankedSegments.slice(0, 3);

  const tips = useMemo(() => {
    const list: string[] = [];

    if (data.performance.listingViews > 20 && data.performance.chatStarts === 0) {
      list.push("High views but no chats. Improve title clarity and first photo.");
    }

    if (data.performance.chatStarts > 0 && data.performance.responseRate < 60) {
      list.push("Response rate is low. Faster replies usually increase conversions.");
    }

    if (
      data.performance.listingViews > 30 &&
      data.performance.savedItems < Math.ceil(data.performance.listingViews * 0.05)
    ) {
      list.push("Views are strong but saves are low. Revisit pricing and details.");
    }

    if (list.length === 0) {
      list.push("Momentum looks healthy. Keep listings active and refresh them regularly.");
    }

    return list.slice(0, 3);
  }, [
    data.performance.chatStarts,
    data.performance.listingViews,
    data.performance.responseRate,
    data.performance.savedItems,
  ]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.background }]}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <DashboardHeader title="Insights" />

      {subscriptionLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : !canAccess ? (
        <AnalyticsLockedCard
          title="Advanced insights unavailable"
          description="The Insights dashboard is reserved for Business plans with advanced analytics."
          requiredPlan="business"
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headingBlock}>
            <ThemedText style={styles.headingTitle}>Marketplace Insights</ThemedText>
            <ThemedText style={styles.headingSubtitle}>
              Why buyers engage this way and what to improve next.
            </ThemedText>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <View style={[styles.sectionCard, { backgroundColor: themeColors.card }]}>
            <ThemedText style={styles.sectionTitle}>Conversion Clues</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Interpretation of behavior flow, not raw totals.
            </ThemedText>

            <View style={styles.clueList}>
              {conversionClues.map((clue) => (
                <View
                  key={clue.key}
                  style={[styles.clueItem, { backgroundColor: themeColors.background }]}
                >
                  <View>
                    <ThemedText style={styles.clueLabel}>{clue.label}</ThemedText>
                    <ThemedText style={styles.clueNote}>{clue.note}</ThemedText>
                  </View>
                  <ThemedText style={styles.clueValue}>{clue.value}</ThemedText>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: themeColors.card }]}>
            <ThemedText style={styles.sectionTitle}>Engagement Funnel</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>Views to Saves to Chats</ThemedText>

            <View style={styles.funnelWrap}>
              {funnelSteps.map((step) => {
                const ratio = step.value > 0 ? Math.round((step.value / funnelBase) * 100) : 0;
                const fillWidth = ratio > 0 ? Math.max(ratio, 8) : 0;

                return (
                  <View key={step.label} style={styles.funnelRow}>
                    <View style={styles.funnelRowTop}>
                      <ThemedText style={styles.funnelLabel}>{step.label}</ThemedText>
                      <ThemedText style={styles.funnelValue}>{step.value}</ThemedText>
                    </View>
                    <View
                      style={[
                        styles.funnelTrack,
                        { backgroundColor: themeColors.background },
                      ]}
                    >
                      <View
                        style={[
                          styles.funnelFill,
                          {
                            backgroundColor: step.color,
                            width: `${fillWidth}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: themeColors.card }]}>
            <ThemedText style={styles.sectionTitle}>Demand Mix</ThemedText>
            <ThemedText style={styles.sectionSubtitle}>
              Category interest from views, saves, and chats (90 days).
            </ThemedText>

            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color={themeColors.primary} />
              </View>
            ) : (
              <InterestsDonutChart segments={data.insights.segments} />
            )}
          </View>

          <View style={[styles.sectionCard, { backgroundColor: themeColors.card }]}>
            <ThemedText style={styles.sectionTitle}>Top Demand Categories</ThemedText>
            <View style={styles.rankList}>
              {topSegments.map((segment) => (
                <View key={segment.label} style={styles.rankItem}>
                  <View style={styles.rankRowTop}>
                    <ThemedText style={styles.rankLabel}>{segment.label}</ThemedText>
                    <ThemedText style={styles.rankValue}>{segment.value}%</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.rankTrack,
                      { backgroundColor: themeColors.background },
                    ]}
                  >
                    <View
                      style={[
                        styles.rankFill,
                        {
                          backgroundColor: segment.color,
                          width: `${Math.max(6, segment.value)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.sectionCard, { backgroundColor: themeColors.card }]}>
            <ThemedText style={styles.sectionTitle}>Actionable Tips</ThemedText>
            <View style={styles.tipList}>
              {tips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <View style={styles.tipDot} />
                  <ThemedText style={styles.tipText}>{tip}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 14,
  },
  headingBlock: {
    marginBottom: 2,
    marginTop: 4,
  },
  headingTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 2,
  },
  headingSubtitle: {
    fontSize: 13,
    opacity: 0.65,
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 10,
    opacity: 0.65,
  },
  clueList: {
    gap: 8,
  },
  clueItem: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  clueLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 1,
  },
  clueNote: {
    fontSize: 12,
    opacity: 0.65,
  },
  clueValue: {
    color: "#16A34A",
    fontSize: 18,
    fontWeight: "800",
  },
  funnelWrap: {
    gap: 10,
  },
  funnelRow: {
    gap: 6,
  },
  funnelRowTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  funnelLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  funnelValue: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.8,
  },
  funnelTrack: {
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  funnelFill: {
    borderRadius: 999,
    height: "100%",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  rankList: {
    gap: 10,
  },
  rankItem: {
    gap: 6,
  },
  rankRowTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rankLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  rankValue: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.7,
  },
  rankTrack: {
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  rankFill: {
    borderRadius: 999,
    height: "100%",
  },
  tipList: {
    gap: 9,
  },
  tipRow: {
    alignItems: "flex-start",
    columnGap: 8,
    flexDirection: "row",
  },
  tipDot: {
    backgroundColor: "#D9382C",
    borderRadius: 999,
    height: 6,
    marginTop: 6,
    width: 6,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.85,
  },
});
