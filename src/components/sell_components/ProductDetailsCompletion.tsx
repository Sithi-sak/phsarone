import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useFormattedProductDetails } from "@src/hooks/useFormattedProductDetails";
import useThemeColor from "@src/hooks/useThemeColor";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface ProductDetailsCompletionProps {
  subCategory: string;
  details: Record<string, any>;
  showMissingFields?: boolean;
}

export default function ProductDetailsCompletion({
  subCategory,
  details,
  showMissingFields = true,
}: ProductDetailsCompletionProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { validation, completionPercentage, filledFields, totalFields } =
    useFormattedProductDetails(subCategory, details);

  if (totalFields === 0) {
    return null;
  }

  const isComplete = validation.isValid;
  const statusColor = isComplete ? themeColors.success : themeColors.warning;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.card }]}>
      {/* Progress Bar */}
      <View style={styles.progressSection}>
        <View
          style={[styles.progressBar, { backgroundColor: themeColors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: statusColor,
                width: `${completionPercentage}%`,
              },
            ]}
          />
        </View>
        <ThemedText style={[styles.progressText, { color: statusColor }]}>
          {completionPercentage}%{" "}
          {t("productDetailsComponents.complete", {
            defaultValue: "Complete",
          })}
        </ThemedText>
      </View>

      {/* Status Info */}
      <View style={styles.statusSection}>
        <ThemedText style={styles.statusLabel}>
          {filledFields}{" "}
          {t("productDetailsComponents.of", { defaultValue: "of" })}{" "}
          {totalFields}{" "}
          {t("productDetailsComponents.fieldsFilled", {
            defaultValue: "fields filled",
          })}
        </ThemedText>
        {!isComplete && showMissingFields && (
          <View style={styles.missingFieldsContainer}>
            <ThemedText
              style={[
                styles.missingFieldsTitle,
                { color: themeColors.warning },
              ]}
            >
              {t("productDetailsComponents.missingRequiredFields", {
                defaultValue: "Missing required fields:",
              })}
            </ThemedText>
            {validation.missingFields.map((field, index) => (
              <ThemedText
                key={index}
                style={[
                  styles.missingField,
                  { color: themeColors.tabIconDefault },
                ]}
              >
                • {field}
              </ThemedText>
            ))}
          </View>
        )}
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
  progressSection: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusSection: {
    gap: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  missingFieldsContainer: {
    paddingLeft: 8,
    gap: 6,
    marginTop: 4,
  },
  missingFieldsTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  missingField: {
    fontSize: 12,
    lineHeight: 16,
  },
});
