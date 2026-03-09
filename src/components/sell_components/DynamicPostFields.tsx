import DescriptionSuggestion from "@src/components/sell_components/DescriptionSuggestion";
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

  const toOptionKey = (value: string) =>
    value
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const localizeSelectOption = (option: string) =>
    t(`optionValues.${toOptionKey(option)}`, { defaultValue: option });

  // Check if condition field exists in the fields array
  const hasConditionField = fields.some((field) => field.key === "condition");

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

  const renderDescriptionSection = () => (
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
        placeholder={t("sellForm.describe_placeholder", {
          defaultValue: "Describe your item ......",
        })}
        multiline
        numberOfLines={4}
        value={draft.description}
        onChangeText={(text) => updateDraft("description", text)}
      />
      <ThemedText
        style={[styles.hintText, { color: themeColors.tabIconDefault }]}
      >
        {t("sellForm.description_hint", {
          defaultValue:
            "Add details about condition, features, or any other relevant information",
        })}
      </ThemedText>

      <DescriptionSuggestion
        subCategory={draft.subCategory}
        currentDescription={draft.description}
        details={draft.details}
        onApply={(description) => updateDraft("description", description)}
      />
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
          placeholder={t("sellForm.title_placeholder", {
            defaultValue: "e.g., Car for Sale",
          })}
          value={draft.title}
          onChangeText={(text) => updateDraft("title", text)}
        />
      </View>

      <ThemedText style={styles.groupHeader}>
        {(t(`subcategories.${draft.subCategory}`) || draft.subCategory) +
          " " +
          t("sellForm.details_suffix", { defaultValue: "Details" })}
      </ThemedText>

      {fields.map((field) => {
        const fieldType = field.type || "text";
        const currentValue = draft.details[field.key];

        return (
          <React.Fragment key={field.key}>
            <View style={styles.fieldSection}>
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
                    keyboardType={
                      fieldType === "number" ? "numeric" : "default"
                    }
                    placeholder={
                      field.key === "model"
                        ? t("sellForm.model_placeholder", {
                            defaultValue: "Camry",
                          })
                        : ""
                    }
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
                <>
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
                            {localizeSelectOption(option)}
                          </ThemedText>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {currentValue === "Others" && (
                    <View style={styles.inputWrapper}>
                      <ThemedTextInput
                        style={[
                          styles.input,
                          {
                            borderColor: themeColors.primary,
                            backgroundColor: themeColors.background,
                            color: themeColors.text,
                            marginTop: 12,
                          },
                        ]}
                        placeholder={t("sellForm.custom_value_placeholder", {
                          defaultValue: `Enter custom ${field.label.toLowerCase()}`,
                          field: t(`fields.${field.key}`, {
                            defaultValue: field.label.toLowerCase(),
                          }),
                        })}
                        value={draft.details[`${field.key}_custom`] || ""}
                        onChangeText={(text) =>
                          updateDetail(`${field.key}_custom`, text)
                        }
                      />
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Render Description Section after Condition field */}
            {field.key === "condition" && renderDescriptionSection()}
          </React.Fragment>
        );
      })}

      {/* Render Description Section at the end if no condition field exists */}
      {!hasConditionField && renderDescriptionSection()}
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
