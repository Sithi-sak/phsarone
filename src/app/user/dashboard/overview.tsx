import AnalyticsLockedCard from "@src/components/dashboard_components/AnalyticsLockedCard";
import {
  DashboardStatCard,
  RecentSellCard,
} from "@src/components/dashboard_components/DashboardCards";
import DashboardHeader from "@src/components/dashboard_components/DashboardHeader";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useCurrentSubscription } from "@src/hooks/useCurrentSubscription";
import { useDashboardAnalytics } from "@src/hooks/useDashboardAnalytics";
import useThemeColor from "@src/hooks/useThemeColor";
import { Stack } from "expo-router";
import {
  ArrowsClockwiseIcon,
  BookmarkSimpleIcon,
  ChatCircleIcon,
  ShoppingBagIcon,
} from "phosphor-react-native";
import React, { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardOverviewScreen() {
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

      <DashboardHeader title="Overview" />

      {subscriptionLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : !canAccess ? (
        <AnalyticsLockedCard
          title="Analytics unavailable"
          description="Overview analytics are available on Starter, Pro, and Business plans."
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
                icon={<ShoppingBagIcon size={20} color="#D9382C" weight="fill" />}
                label="Active Listings"
                value={data.overview.activeListings}
              />
            </View>

            <View style={styles.gridItem}>
              <DashboardStatCard
                icon={
                  <ArrowsClockwiseIcon size={20} color="#D9382C" weight="bold" />
                }
                label="Sold Listings"
                value={data.overview.soldListings}
              />
            </View>

            <View style={styles.gridItem}>
              <DashboardStatCard
                icon={<ChatCircleIcon size={20} color="#D9382C" weight="fill" />}
                label="Active Chats"
                value={data.overview.activeChats}
              />
            </View>

            <View style={styles.gridItem}>
              <DashboardStatCard
                icon={
                  <BookmarkSimpleIcon size={20} color="#D9382C" weight="fill" />
                }
                label="Saved by Users"
                value={data.overview.savedByUsers}
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
