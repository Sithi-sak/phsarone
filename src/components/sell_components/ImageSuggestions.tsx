import PhotographyTips from "@src/components/sell_components/PhotographyTips";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ImageType } from "@src/hooks/useImageSuggestions";
import useThemeColor from "@src/hooks/useThemeColor";
import {
  CheckCircleIcon,
  InfoIcon,
  TrendUpIcon,
  WarningIcon,
} from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface ImageSuggestionsProps {
  currentImageCount: number;
  recommendedImageCount: number;
  completionPercentage: number;
  suggestedImages: Array<{
    type: ImageType;
    label: string;
    description: string;
    isUploaded: boolean;
  }>;
  warnings: Array<{
    message: string;
    severity: "warning" | "info";
  }>;
}

export default function ImageSuggestions({
  currentImageCount,
  recommendedImageCount,
  completionPercentage,
  suggestedImages,
  warnings,
}: ImageSuggestionsProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColor();
  const [expandedTips, setExpandedTips] = useState(false);

  const uploadedCount = suggestedImages.filter((img) => img.isUploaded).length;
  const isComplete = completionPercentage >= 100;

  const getQualityGrade = (percentage: number): string => {
    if (percentage >= 100) return t("sellSection.quality_grade_perfect");
    if (percentage >= 85) return t("sellSection.quality_grade_excellent");
    if (percentage >= 70) return t("sellSection.quality_grade_good");
    if (percentage >= 50) return t("sellSection.quality_grade_fair");
    return t("sellSection.quality_grade_needs_work");
  };

  const getTranslatedImageLabel = (type: ImageType): string => {
    const labelMap: Record<ImageType, string> = {
      front: t("sellSection.front_view"),
      back: t("sellSection.back_view"),
      closeup: t("sellSection.closeup"),
      packaging: t("sellSection.packaging"),
      damage: t("sellSection.damage_condition"),
      other: t("sellSection.additional_views"),
    };
    return labelMap[type] || "";
  };

  const getTranslatedImageDescription = (type: ImageType): string => {
    const descriptionMap: Record<ImageType, string> = {
      front: t("sellSection.front_view_desc"),
      back: t("sellSection.back_view_desc"),
      closeup: t("sellSection.closeup_desc"),
      packaging: t("sellSection.packaging_desc"),
      damage: t("sellSection.damage_condition_desc"),
      other: t("sellSection.additional_views_desc"),
    };
    return descriptionMap[type] || "";
  };

  const getTranslatedWarningMessage = (message: string): string => {
    if (message.includes("Add at least 3 photos")) {
      return t("sellSection.recommended_images");
    }
    if (message.includes("Add one more photo")) {
      return t("sellSection.add_one_more");
    }
    return message;
  };

  const styles = StyleSheet.create({
    container: {
      backgroundColor: themeColors.secondaryBackground,
      borderRadius: 12,
      marginVertical: 12,
      overflow: "hidden",
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    titleEmoji: {
      fontSize: 18,
      marginRight: 8,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 0,
      color: themeColors.text,
      flex: 1,
    },
    gradeTag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
      backgroundColor: isComplete ? "#22c55e" : "#eab308",
    },
    gradeText: {
      fontSize: 10,
      fontWeight: "700",
      color: "#fff",
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    statText: {
      fontSize: 12,
      color: themeColors.tabIconDefault,
    },
    progressContainer: {
      backgroundColor: themeColors.background,
      borderRadius: 8,
      height: 10,
      marginVertical: 8,
      overflow: "hidden",
    },
    progressBar: {
      height: "100%",
      backgroundColor: isComplete ? "#22c55e" : "#eab308",
      borderRadius: 8,
    },
    progressText: {
      fontSize: 12,
      color: themeColors.tabIconDefault,
      marginTop: 4,
      fontWeight: "600",
    },
    warningSection: {
      marginTop: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    warningItem: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: themeColors.background,
    },
    warningIcon: {
      marginRight: 10,
      marginTop: 2,
    },
    warningText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
      color: themeColors.text,
    },
    suggestionsSection: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      marginTop: 12,
    },
    suggestionTitle: {
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 10,
      color: themeColors.text,
    },
    suggestionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    suggestionItem: {
      flex: 1,
      minWidth: "45%",
      flexDirection: "row",
      alignItems: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: themeColors.background,
    },
    suggestionItemUploaded: {
      opacity: 0.5,
      backgroundColor: "rgba(34, 197, 94, 0.1)",
    },
    suggestionIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    suggestionContent: {
      flex: 1,
    },
    suggestionLabel: {
      fontSize: 12,
      fontWeight: "600",
      color: themeColors.text,
    },
    suggestionDescription: {
      fontSize: 10,
      color: themeColors.tabIconDefault,
      marginTop: 2,
    },
    achievementBanner: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: "rgba(34, 197, 94, 0.1)",
      borderTopWidth: 1,
      borderTopColor: "rgba(34, 197, 94, 0.3)",
      flexDirection: "row",
      alignItems: "center",
    },
    achievementIcon: {
      marginRight: 10,
    },
    achievementText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#22c55e",
      flex: 1,
    },
    tipsButton: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
    },
    tipsButtonText: {
      fontSize: 12,
      fontWeight: "500",
      color: themeColors.primary,
      flex: 1,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText style={styles.titleEmoji}>📸</ThemedText>
          <ThemedText style={styles.title}>
            {t("sellSection.image_suggestions_title")}
          </ThemedText>
          <View style={styles.gradeTag}>
            <ThemedText style={styles.gradeText}>
              {getQualityGrade(completionPercentage)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.statsRow}>
          <ThemedText style={styles.statText}>
            {currentImageCount}/{recommendedImageCount}{" "}
            {t("sellSection.image_stats_photos")}
          </ThemedText>
          <ThemedText style={styles.statText}>
            {uploadedCount}/{suggestedImages.length}{" "}
            {t("sellSection.image_stats_types")}
          </ThemedText>
        </View>

        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBar, { width: `${completionPercentage}%` }]}
          />
        </View>

        <ThemedText style={styles.progressText}>
          {isComplete
            ? "✅ " +
              t("sellSection.quality_grade_perfect") +
              "! " +
              t("sellSection.image_suggestions_title")
            : `${Math.round(completionPercentage)}% ${t("sellSection.image_stats_completion")}`}
        </ThemedText>
      </View>

      {warnings.length > 0 && (
        <View style={styles.warningSection}>
          {warnings.map((warning, index) => (
            <View
              key={index}
              style={[
                styles.warningItem,
                {
                  backgroundColor:
                    warning.severity === "warning"
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(59, 130, 246, 0.1)",
                },
              ]}
            >
              <View style={styles.warningIcon}>
                {warning.severity === "warning" ? (
                  <WarningIcon size={16} color="#ef4444" weight="fill" />
                ) : (
                  <InfoIcon size={16} color="#3b82f6" weight="fill" />
                )}
              </View>
              <ThemedText style={styles.warningText}>
                {getTranslatedWarningMessage(warning.message)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      <View style={styles.suggestionsSection}>
        <ThemedText style={styles.suggestionTitle}>
          {t("sellSection.recommended_image_types")}
        </ThemedText>

        <View style={styles.suggestionGrid}>
          {suggestedImages.map((image, index) => (
            <View
              key={index}
              style={[
                styles.suggestionItem,
                image.isUploaded && styles.suggestionItemUploaded,
              ]}
            >
              <View style={styles.suggestionIcon}>
                {image.isUploaded ? (
                  <CheckCircleIcon size={16} color="#22c55e" weight="fill" />
                ) : (
                  <InfoIcon
                    size={16}
                    color={themeColors.tabIconDefault}
                    weight="regular"
                  />
                )}
              </View>
              <View style={styles.suggestionContent}>
                <ThemedText style={styles.suggestionLabel}>
                  {getTranslatedImageLabel(image.type)}
                </ThemedText>
                <ThemedText style={styles.suggestionDescription}>
                  {getTranslatedImageDescription(image.type)}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
      </View>

      {isComplete && (
        <View style={styles.achievementBanner}>
          <ThemedText style={styles.achievementIcon}>🎉</ThemedText>
          <ThemedText style={styles.achievementText}>
            {t("sellSection.achievement_message")}
          </ThemedText>
        </View>
      )}

      <TouchableOpacity
        style={styles.tipsButton}
        onPress={() => setExpandedTips(!expandedTips)}
      >
        <ThemedText style={styles.tipsButtonText}>
          {expandedTips
            ? t("sellSection.hide_photography_tips")
            : t("sellSection.show_photography_tips")}
        </ThemedText>
        <TrendUpIcon
          size={16}
          color={themeColors.primary}
          weight="bold"
          style={{ transform: [{ rotate: expandedTips ? "180deg" : "0deg" }] }}
        />
      </TouchableOpacity>

      {expandedTips && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <PhotographyTips
            imageCount={currentImageCount}
            completionPercentage={completionPercentage}
          />
        </View>
      )}
    </View>
  );
}
