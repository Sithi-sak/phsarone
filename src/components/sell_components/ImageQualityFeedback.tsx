import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { ImageQualityMetrics } from "@src/utils/imageQuality";
import {
  CheckCircleIcon,
  InfoIcon,
  TrendUpIcon,
  WarningIcon,
} from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface ImageQualityFeedbackProps {
  metrics: ImageQualityMetrics;
  imageIndex: number;
}

export default function ImageQualityFeedback({
  metrics,
  imageIndex,
}: ImageQualityFeedbackProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const getQualityColor = (score: number) => {
    if (score >= 80) return "#22c55e";
    if (score >= 60) return "#eab308";
    return "#ef4444";
  };

  const getQualityLabel = (score: number) => {
    if (score >= 85) return t("sellSection.quality_grade_excellent");
    if (score >= 70) return t("sellSection.quality_grade_good");
    if (score >= 50) return t("sellSection.quality_grade_fair");
    return t("sellSection.quality_grade_needs_work");
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#eab308";
      default:
        return "#22c55e";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return t("sellSection.priority_high");
      case "medium":
        return t("sellSection.priority_medium");
      default:
        return t("sellSection.priority_low");
    }
  };

  const qualityColor = getQualityColor(metrics.qualityScore);
  const priorityColor = getPriorityColor(metrics.priority);

  const styles = StyleSheet.create({
    container: {
      backgroundColor: themeColors.secondaryBackground,
      borderRadius: 12,
      marginBottom: 12,
      borderLeftWidth: 4,
      borderLeftColor: qualityColor,
      overflow: "hidden",
    },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    titleSection: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: "600",
      color: themeColors.text,
    },
    fileName: {
      fontSize: 11,
      color: themeColors.tabIconDefault,
      marginTop: 2,
    },
    scoreSection: {
      alignItems: "center",
      marginHorizontal: 12,
    },
    scoreNumber: {
      fontSize: 24,
      fontWeight: "700",
      color: qualityColor,
    },
    scoreLabel: {
      fontSize: 10,
      color: themeColors.tabIconDefault,
      marginTop: 2,
      fontWeight: "600",
    },
    priorityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      backgroundColor: priorityColor,
      marginLeft: 4,
    },
    priorityText: {
      fontSize: 10,
      color: "#fff",
      fontWeight: "600",
    },
    expandButton: {
      padding: 4,
    },
    detailsContainer: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    scoreBreakdown: {
      backgroundColor: themeColors.background,
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
    },
    breakdownItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    breakdownLabel: {
      fontSize: 12,
      color: themeColors.tabIconDefault,
      flex: 1,
    },
    breakdownValue: {
      fontSize: 12,
      fontWeight: "600",
      color: themeColors.text,
    },
    metricsGrid: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 12,
    },
    metricCard: {
      flex: 1,
      backgroundColor: themeColors.background,
      borderRadius: 8,
      padding: 10,
      alignItems: "center",
    },
    metricLabel: {
      fontSize: 10,
      color: themeColors.tabIconDefault,
      marginTop: 6,
      textAlign: "center",
      fontWeight: "600",
    },
    metricValue: {
      fontSize: 13,
      fontWeight: "700",
      color: themeColors.text,
      marginTop: 2,
    },
    recommendationsSection: {
      borderTopWidth: 1,
      borderTopColor: themeColors.border,
      paddingTop: 12,
      marginTop: 12,
    },
    recommendationTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: themeColors.text,
      marginBottom: 8,
    },
    recommendation: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: "rgba(239, 68, 68, 0.08)",
    },
    recommendationIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    recommendationText: {
      fontSize: 11,
      color: themeColors.text,
      flex: 1,
      lineHeight: 14,
    },
    successRecommendation: {
      backgroundColor: "rgba(34, 197, 94, 0.08)",
    },
    successText: {
      color: "#22c55e",
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.titleSection}>
          <ThemedText style={styles.title}>Image {imageIndex + 1}</ThemedText>
          <ThemedText style={styles.fileName} numberOfLines={1}>
            {metrics.fileName}
          </ThemedText>
        </View>

        <View style={styles.scoreSection}>
          <ThemedText style={styles.scoreNumber}>
            {metrics.qualityScore}
          </ThemedText>
          <ThemedText style={styles.scoreLabel}>
            {getQualityLabel(metrics.qualityScore)}
          </ThemedText>
        </View>

        <View style={styles.priorityBadge}>
          <ThemedText style={styles.priorityText}>
            {getPriorityLabel(metrics.priority)}
          </ThemedText>
        </View>

        <View style={styles.expandButton}>
          <TrendUpIcon
            size={20}
            color={themeColors.primary}
            weight="bold"
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detailsContainer}>
          {/* Score Breakdown */}
          <View style={styles.scoreBreakdown}>
            <ThemedText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: themeColors.text,
                marginBottom: 8,
              }}
            >
              {t("sellSection.quality_breakdown")}
            </ThemedText>

            <View style={styles.breakdownItem}>
              <ThemedText style={styles.breakdownLabel}>
                {t("sellSection.resolution_label")}
              </ThemedText>
              <ThemedText style={[styles.breakdownValue]}>
                {metrics.scoreBreakdown.resolution === 0
                  ? "+0"
                  : metrics.scoreBreakdown.resolution}
              </ThemedText>
            </View>

            <View style={styles.breakdownItem}>
              <ThemedText style={styles.breakdownLabel}>
                {t("sellSection.file_size_label")}
              </ThemedText>
              <ThemedText style={[styles.breakdownValue]}>
                {metrics.scoreBreakdown.fileSize === 0
                  ? "+0"
                  : metrics.scoreBreakdown.fileSize}
              </ThemedText>
            </View>

            <View style={styles.breakdownItem}>
              <ThemedText style={styles.breakdownLabel}>
                {t("sellSection.aspect_ratio_label")}
              </ThemedText>
              <ThemedText style={[styles.breakdownValue]}>
                {metrics.scoreBreakdown.aspectRatio === 0
                  ? "+0"
                  : metrics.scoreBreakdown.aspectRatio}
              </ThemedText>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <InfoIcon size={16} color={themeColors.primary} />
              <ThemedText style={styles.metricLabel}>
                {t("sellSection.resolution_label")}
              </ThemedText>
              <ThemedText style={styles.metricValue}>
                {metrics.dimensions.width}x{metrics.dimensions.height}
              </ThemedText>
            </View>

            <View style={styles.metricCard}>
              <InfoIcon size={16} color={themeColors.primary} />
              <ThemedText style={styles.metricLabel}>
                {t("sellSection.file_size_label")}
              </ThemedText>
              <ThemedText style={styles.metricValue}>
                {(metrics.fileSize / 1024 / 1024).toFixed(2)}MB
              </ThemedText>
            </View>

            <View style={styles.metricCard}>
              <InfoIcon size={16} color={themeColors.primary} />
              <ThemedText style={styles.metricLabel}>
                {t("sellSection.aspect_ratio_label")}
              </ThemedText>
              <ThemedText style={styles.metricValue}>
                {(metrics.dimensions.width / metrics.dimensions.height).toFixed(
                  2,
                )}
              </ThemedText>
            </View>
          </View>

          {/* Issues */}
          {Object.entries(metrics.issues).length > 0 && (
            <View style={styles.recommendationsSection}>
              <ThemedText style={styles.recommendationTitle}>
                {t("sellSection.issues_found")}
              </ThemedText>
              {Object.entries(metrics.issues).map(([key, value], idx) => (
                <View key={idx} style={styles.recommendation}>
                  <View style={styles.recommendationIcon}>
                    <WarningIcon size={12} color="#ef4444" weight="fill" />
                  </View>
                  <ThemedText style={styles.recommendationText}>
                    {value}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <View style={styles.recommendationsSection}>
              <ThemedText style={styles.recommendationTitle}>
                {t("sellSection.suggestions")}
              </ThemedText>
              {metrics.recommendations.map((recommend, idx) => (
                <View key={idx} style={styles.recommendation}>
                  <View style={styles.recommendationIcon}>
                    <InfoIcon size={12} color="#3b82f6" weight="fill" />
                  </View>
                  <ThemedText style={styles.recommendationText}>
                    {recommend}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Success Message */}
          {metrics.qualityScore >= 80 &&
            metrics.recommendations.length === 0 && (
              <View
                style={[
                  styles.recommendation,
                  styles.successRecommendation,
                  { marginTop: 12 },
                ]}
              >
                <View style={styles.recommendationIcon}>
                  <CheckCircleIcon size={12} color="#22c55e" weight="fill" />
                </View>
                <ThemedText
                  style={[styles.recommendationText, styles.successText]}
                >
                  {t("sellSection.quality_success_message")}
                </ThemedText>
              </View>
            )}
        </View>
      )}
    </View>
  );
}
