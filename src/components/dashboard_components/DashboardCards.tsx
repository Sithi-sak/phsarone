import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { TrendUpIcon } from "phosphor-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface DashboardStatCardProps {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
  trendText?: string;
}

interface RecentSellItem {
  id: string;
  title: string;
  subtitle: string;
  price: string;
}

interface RecentSellCardProps {
  title: string;
  viewAllLabel: string;
  items: RecentSellItem[];
  emptyText?: string;
}

export function DashboardStatCard({
  icon,
  label,
  value,
  trendText,
}: DashboardStatCardProps) {
  const themeColors = useThemeColor();

  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
        },
      ]}
    >
      {icon ? <View style={styles.statIconWrap}>{icon}</View> : null}
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      {trendText ? (
        <View style={styles.trendRow}>
          <TrendUpIcon size={16} color="#22C55E" weight="bold" />
          <ThemedText style={styles.trendText}>{trendText}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

export function RecentSellCard({
  title,
  viewAllLabel,
  items,
  emptyText,
}: RecentSellCardProps) {
  const themeColors = useThemeColor();

  return (
    <View
      style={[
        styles.recentCard,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
        },
      ]}
    >
      <View style={styles.recentHeader}>
        <ThemedText style={styles.recentTitle}>{title}</ThemedText>
        <TouchableOpacity activeOpacity={0.75}>
          <ThemedText style={styles.viewAll}>{viewAllLabel}</ThemedText>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <ThemedText style={styles.emptyText}>
          {emptyText || "No items yet."}
        </ThemedText>
      ) : (
        items.map((item, index) => (
          <View
            key={item.id}
            style={index === items.length - 1 ? null : styles.itemGap}
          >
            <View style={styles.itemRow}>
              <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.itemPrice}>{item.price}</ThemedText>
            </View>
            <ThemedText style={styles.itemSubtitle}>{item.subtitle}</ThemedText>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statCard: {
    borderRadius: 20,
    borderCurve: "continuous",
    minHeight: 108,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  statIconWrap: {
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  trendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  recentCard: {
    borderRadius: 20,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  recentHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  recentTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  viewAll: {
    fontSize: 14,
    opacity: 0.45,
  },
  emptyText: {
    fontSize: 13,
    opacity: 0.6,
  },
  itemGap: {
    marginBottom: 14,
  },
  itemRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemSubtitle: {
    fontSize: 14,
    opacity: 0.58,
  },
});
