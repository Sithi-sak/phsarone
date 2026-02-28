import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ThemedTextInput } from "@src/components/shared_components/ThemedTextInput";
import { useSellDraft } from "@src/context/SellDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { TFunction } from "i18next";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface DynamicPostFieldsProps {
  fields: any[];
  themeColors: ReturnType<typeof useThemeColor>;
  t: TFunction<"translation", undefined>;
}

export default function DynamicPostFields({ fields }: DynamicPostFieldsProps) {
  const { draft, updateDetail, updateDraft } = useSellDraft();
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  const renderLabel = (field: any) => (
    <View style={styles.labelRow}>
      <ThemedText style={styles.inputLabel}>
        {t(`fields.${field.key}`)}
      </ThemedText>
      {field.required && (
        <ThemedText style={{ color: themeColors.primary }}>*</ThemedText>
      )}
    </View>
  );

  return (
    <>
      {/* Title Section */}
      <View style={styles.fieldSection}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.inputLabel}>{t("fields.title")}</ThemedText>
          <ThemedText style={{ color: themeColors.primary }}>*</ThemedText>
        </View>
        <ThemedTextInput
          style={[
            styles.input,
            {
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
              color: themeColors.text,
            },
          ]}
          placeholder="e.g., Car for Sale"
          value={draft.title}
          onChangeText={(text) => updateDraft("title", text)}
        />
      </View>

      {/* Description Section */}
      <View style={styles.fieldSection}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.inputLabel}>
            {t("productDetail.description")}
          </ThemedText>
        </View>
        <ThemedTextInput
          style={[
            styles.input,
            styles.textArea,
            {
              borderColor: themeColors.border,
              backgroundColor: themeColors.background,
              color: themeColors.text,
            },
          ]}
          placeholder="Describe your item ......"
          multiline
          numberOfLines={4}
          value={draft.description}
          onChangeText={(text) => updateDraft("description", text)}
        />
        <ThemedText
          style={[styles.hintText, { color: themeColors.tabIconDefault }]}
        >
          Add details about condition, features, or any other relevant
          information
        </ThemedText>
      </View>

      <ThemedText style={styles.groupHeader}>
        {t(`subcategories.${draft.subCategory}`) || draft.subCategory} Details
      </ThemedText>

      {fields.map((field) => {
        const fieldType = field.type || "text";
        const currentValue = draft.details[field.key];

        return (
          <View key={field.key} style={styles.fieldSection}>
            {renderLabel(field)}

            {(fieldType === "text" || fieldType === "number") && (
              <View style={styles.inputWrapper}>
                <ThemedTextInput
                  style={[
                    styles.input,
                    {
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    },
                  ]}
                  value={currentValue || ""}
                  onChangeText={(text) => updateDetail(field.key, text)}
                  keyboardType={fieldType === "number" ? "numeric" : "default"}
                  placeholder={field.key === "model" ? "Camry" : ""}
                />
                {field.key === "mileage" && (
                  <ThemedText
                    style={[
                      styles.unitText,
                      { color: themeColors.tabIconDefault },
                    ]}
                  >
                    KM
                  </ThemedText>
                )}
              </View>
            )}

            {fieldType === "select" && field.options && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipContent}
              >
                {field.options.map((option: string) => {
                  const isSelected = currentValue === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.chip,
                        {
                          borderColor: themeColors.border,
                          backgroundColor: themeColors.card,
                        },
                        isSelected && {
                          borderColor: themeColors.primary,
                          borderWidth: 2,
                        },
                      ]}
                      onPress={() => updateDetail(field.key, option)}
                      activeOpacity={0.7}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          isSelected && {
                            color: themeColors.primary,
                            fontWeight: "700",
                          },
                        ]}
                      >
                        {option}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  fieldSection: {
    marginBottom: 2,
  },
  labelRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 8,
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  groupHeader: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    height: 44,
  },
  unitText: {
    position: "absolute",
    right: 16,
    fontSize: 14,
    fontWeight: "600",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  hintText: {
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  chipScroll: {
    marginTop: 4,
  },
  chipContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 90,
    alignItems: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
