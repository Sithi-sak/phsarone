import AnalyticsLockedCard from "@src/components/dashboard_components/AnalyticsLockedCard";
import DashboardHeader from "@src/components/dashboard_components/DashboardHeader";
import {
  DashboardStatCard,
  RecentSellCard,
} from "@src/components/dashboard_components/DashboardCards";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useCurrentSubscription } from "@src/hooks/useCurrentSubscription";
import { useDashboardAnalytics } from "@src/hooks/useDashboardAnalytics";
import useThemeColor from "@src/hooks/useThemeColor";
import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function signedValue(value: number, suffix = ""): string {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}${suffix}`;
}

export default function DashboardPerformanceScreen() {
  const themeColors = useThemeColor();
  const {
    entitlements,
    loading: subscriptionLoading,
    refresh: refreshSubscription,
  } = useCurrentSubscription();
  const canAccess = entitlements.hasBasicAnalytics;
  const { data, error, loading } = useDashboardAnalytics(canAccess);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.background }]}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <DashboardHeader title="Performance" />

      {subscriptionLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : !canAccess ? (
        <AnalyticsLockedCard
          title="Performance analytics unavailable"
          description="Performance analytics are available on Starter, Pro, and Business plans."
          requiredPlan="starter"
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={themeColors.primary} />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <DashboardStatCard
                label="Listing Views"
                value={data.performance.listingViews}
                trendText={signedValue(data.performance.listingViewsDelta)}
              />
            </View>

            <View style={styles.gridItem}>
              <DashboardStatCard
                label="Chat Starts"
                value={data.performance.chatStarts}
                trendText={signedValue(data.performance.chatStartsDelta)}
              />
            </View>

            <View style={styles.gridItem}>
              <DashboardStatCard
                label="Response Rate"
                value={`${data.performance.responseRate}%`}
                trendText={signedValue(data.performance.responseRateDelta, "%")}
              />
            </View>

            <View style={styles.gridItem}>
              <DashboardStatCard
                label="Saved Items"
                value={data.performance.savedItems}
                trendText={signedValue(data.performance.savedItemsDelta)}
              />
            </View>
          </View>

          <RecentSellCard
            title="Recent Sold Listings"
            viewAllLabel="View all"
            items={data.overview.recentSold}
            emptyText="No sold listings yet."
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingBottom: 20,
    paddingHorizontal: 14,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 8,
  },
  gridItem: {
    width: "49%",
  },
});
