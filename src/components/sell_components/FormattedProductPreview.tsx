import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import {
  formatProductDetails,
  FormattedDetail,
} from "@src/utils/productFormatter";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface FormattedProductPreviewProps {
  subCategory: string;
  details: Record<string, any>;
  title?: string;
}

export default function FormattedProductPreview({
  subCategory,
  details,
  title,
}: FormattedProductPreviewProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const formatted = formatProductDetails(subCategory, details);
  const displayTitle =
    title ||
    t("productDetailsComponents.detailsSummary", {
      defaultValue: "Details Summary",
    });

  if (formatted.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <ThemedText style={styles.title}>{displayTitle}</ThemedText>
      <View style={styles.detailsGrid}>
        {formatted.map((detail) => (
          <DetailRow key={detail.key} detail={detail} />
        ))}
      </View>
    </View>
  );
}

interface DetailRowProps {
  detail: FormattedDetail;
}

function DetailRow({ detail }: DetailRowProps) {
  const themeColors = useThemeColor();

  return (
    <View style={styles.detailRow}>
      <ThemedText
        style={[styles.detailLabel, { color: themeColors.tabIconDefault }]}
      >
        {detail.label}
      </ThemedText>
      <ThemedText
        style={[styles.detailValue, { color: themeColors.text }]}
        numberOfLines={1}
      >
        {detail.value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "capitalize",
  },
  detailsGrid: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
});
