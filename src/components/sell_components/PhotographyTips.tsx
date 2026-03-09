import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface PhotographyTipsProps {
  imageCount: number;
  completionPercentage: number;
}

export default function PhotographyTips({
  imageCount,
  completionPercentage,
}: PhotographyTipsProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  const PHOTOGRAPHY_TIPS = [
    {
      title: t("sellSection.photography_tip_lighting"),
      description: t("sellSection.photography_tip_lighting_desc"),
      emoji: "☀️",
    },
    {
      title: t("sellSection.photography_tip_background"),
      description: t("sellSection.photography_tip_background_desc"),
      emoji: "🎨",
    },
    {
      title: t("sellSection.photography_tip_angles"),
      description: t("sellSection.photography_tip_angles_desc"),
      emoji: "📐",
    },
    {
      title: t("sellSection.photography_tip_details"),
      description: t("sellSection.photography_tip_details_desc"),
      emoji: "🔍",
    },
    {
      title: t("sellSection.photography_tip_sharpness"),
      description: t("sellSection.photography_tip_sharpness_desc"),
      emoji: "✨",
    },
    {
      title: t("sellSection.photography_tip_scale"),
      description: t("sellSection.photography_tip_scale_desc"),
      emoji: "📏",
    },
    {
      title: t("sellSection.photography_tip_packaging"),
      description: t("sellSection.photography_tip_packaging_desc"),
      emoji: "📦",
    },
    {
      title: t("sellSection.photography_tip_honesty"),
      description: t("sellSection.photography_tip_honesty_desc"),
      emoji: "✅",
    },
  ];

  const relevantTip = useMemo(() => {
    if (imageCount === 0) {
      return PHOTOGRAPHY_TIPS[0]; // Lighting
    } else if (imageCount === 1) {
      return PHOTOGRAPHY_TIPS[2]; // Multiple angles
    } else if (imageCount === 2) {
      return PHOTOGRAPHY_TIPS[3]; // Focus on details
    } else if (completionPercentage < 100) {
      return PHOTOGRAPHY_TIPS[6]; // Packaging
    } else {
      return PHOTOGRAPHY_TIPS[7]; // Honesty
    }
  }, [imageCount, completionPercentage]);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: "rgba(59, 130, 246, 0.08)",
      borderRadius: 12,
      padding: 12,
      marginVertical: 12,
      borderLeftWidth: 4,
      borderLeftColor: "#3b82f6",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    emoji: {
      fontSize: 20,
      marginRight: 8,
    },
    title: {
      fontSize: 13,
      fontWeight: "600",
      color: themeColors.text,
      flex: 1,
    },
    description: {
      fontSize: 11,
      color: themeColors.text,
      lineHeight: 15,
      opacity: 0.8,
      marginLeft: 28,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.emoji}>{relevantTip.emoji}</ThemedText>
        <ThemedText style={styles.title}>{relevantTip.title}</ThemedText>
      </View>
      <ThemedText style={styles.description}>
        {relevantTip.description}
      </ThemedText>
    </View>
  );
}
