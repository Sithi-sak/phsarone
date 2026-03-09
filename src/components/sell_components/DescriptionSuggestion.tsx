import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { generateDescriptionSuggestion } from "@src/utils/productFormatter";
import { Check, SparkleIcon } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface DescriptionSuggestionProps {
  subCategory: string;
  currentDescription: string;
  details: Record<string, any>;
  onApply: (description: string) => void;
}

export default function DescriptionSuggestion({
  subCategory,
  currentDescription,
  details,
  onApply,
}: DescriptionSuggestionProps) {
  const themeColors = useThemeColor();
  const { t, i18n } = useTranslation();
  const [suggestion, setSuggestion] = useState(() =>
    generateDescriptionSuggestion(
      subCategory,
      currentDescription,
      details,
      i18n.language,
    ),
  );

  // Regenerate suggestion when language changes
  useEffect(() => {
    setSuggestion(
      generateDescriptionSuggestion(
        subCategory,
        currentDescription,
        details,
        i18n.language,
      ),
    );
  }, [i18n.language, subCategory, currentDescription, details]);

  // Listen for explicit language changes
  useEffect(() => {
    const handleLanguageChanged = () => {
      setSuggestion(
        generateDescriptionSuggestion(
          subCategory,
          currentDescription,
          details,
          i18n.language,
        ),
      );
    };

    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [subCategory, currentDescription, details, i18n]);

  if (!suggestion.shouldShow) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.primary + "10",
          borderColor: themeColors.primary,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <SparkleIcon size={18} color={themeColors.primary} weight="fill" />
          <ThemedText style={[styles.title, { color: themeColors.primary }]}>
            {suggestion.isGeneric
              ? t("descriptionSuggestion.enhance", {
                  defaultValue: "Enhance Your Description",
                })
              : t("descriptionSuggestion.addMore", {
                  defaultValue: "Add More Details",
                })}
          </ThemedText>
        </View>
      </View>

      <View style={styles.suggestionBox}>
        <ThemedText
          style={[
            styles.suggestionLabel,
            { color: themeColors.tabIconDefault },
          ]}
        >
          {t("descriptionSuggestion.suggested", {
            defaultValue: "Suggested description:",
          })}
        </ThemedText>
        <ThemedText
          style={[styles.suggestionText, { color: themeColors.text }]}
        >
          {suggestion.suggested}
        </ThemedText>
      </View>

      <TouchableOpacity
        style={[styles.applyButton, { backgroundColor: themeColors.primary }]}
        onPress={() => onApply(suggestion.suggested)}
        activeOpacity={0.7}
      >
        <Check size={16} color="white" weight="bold" />
        <ThemedText style={styles.applyButtonText}>
          {t("descriptionSuggestion.useThis", {
            defaultValue: "Use This Description",
          })}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  suggestionBox: {
    gap: 6,
  },
  suggestionLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  suggestionText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
