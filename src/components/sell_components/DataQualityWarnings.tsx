import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import {
  DataQualityIssue,
  validateDataQuality,
} from "@src/utils/productFormatter";
import { Info, WarningCircle } from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface DataQualityWarningsProps {
  subCategory: string;
  details: Record<string, any>;
}

export default function DataQualityWarnings({
  subCategory,
  details,
}: DataQualityWarningsProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const issues = validateDataQuality(subCategory, details);

  if (issues.length === 0) {
    return null;
  }

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: themeColors.text }]}>
          {t("productDetailsComponents.reviewDetails")}
        </ThemedText>
        <ThemedText
          style={[styles.subtitle, { color: themeColors.tabIconDefault }]}
        >
          {errorCount > 0 &&
            `${errorCount} ${t(errorCount > 1 ? "productDetailsComponents.errors" : "productDetailsComponents.error")}`}
          {errorCount > 0 && warningCount > 0 && ", "}
          {warningCount > 0 &&
            `${warningCount} ${t(warningCount > 1 ? "productDetailsComponents.warnings" : "productDetailsComponents.warning")}`}
        </ThemedText>
      </View>

      <View style={styles.issuesList}>
        {issues.map((issue, index) => (
          <IssueItem
            key={index}
            issue={issue}
            themeColors={themeColors}
            t={t}
          />
        ))}
      </View>
    </View>
  );
}

interface IssueItemProps {
  issue: DataQualityIssue;
  themeColors: any;
  t: any;
}

function IssueItem({ issue, themeColors, t }: IssueItemProps) {
  const severityColors = {
    error: themeColors.error || "#ff4444",
    warning: themeColors.warning || "#ffaa00",
    info: themeColors.primary || "#0066ff",
  };

  const color = severityColors[issue.severity];

  return (
    <View style={[styles.issueItem, { borderLeftColor: color }]}>
      <View style={styles.issueHeader}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {issue.severity === "error" && (
            <WarningCircle size={16} color={color} weight="fill" />
          )}
          {issue.severity === "warning" && (
            <WarningCircle size={16} color={color} weight="fill" />
          )}
          {issue.severity === "info" && (
            <Info size={16} color={color} weight="fill" />
          )}
          <ThemedText style={[styles.fieldName, { color }]}>
            {issue.field}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.issueText, { color: themeColors.text }]}>
        {issue.issue}
      </ThemedText>

      <View
        style={[
          styles.suggestionBox,
          { backgroundColor: color + "10", borderColor: color + "30" },
        ]}
      >
        <ThemedText style={[styles.suggestionLabel, { color }]}>
          💡 {t("productDetailsComponents.suggestion")}
        </ThemedText>
        <ThemedText
          style={[styles.suggestionText, { color: themeColors.text }]}
        >
          {issue.suggestion}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 12,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  issuesList: {
    gap: 12,
  },
  issueItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    gap: 8,
  },
  issueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fieldName: {
    fontSize: 14,
    fontWeight: "600",
  },
  issueText: {
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  suggestionBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  suggestionText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
