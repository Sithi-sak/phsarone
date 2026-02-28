import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ThemedTextInput } from "@src/components/shared_components/ThemedTextInput";
import { useSellDraft } from "@src/context/SellDraftContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { CheckIcon } from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export default function PriceAndDiscountForm() {
  const { draft, updateDraft } = useSellDraft();
  const themeColors = useThemeColor();
  useTranslation();
  const { t } = useTranslation();
  return (
    <>
      {/* Pricing Section */}
      <View style={styles.fieldSection}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.inputLabel}>
            {t("sellSection.Price")}
          </ThemedText>
          <ThemedText style={{ color: themeColors.primary }}>*</ThemedText>
        </View>
        <View style={styles.inputWrapper}>
          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: themeColors.border,
                backgroundColor: themeColors.card,
              },
            ]}
            value={draft.price}
            onChangeText={(text) => updateDraft("price", text)}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <ThemedText style={[styles.unitText, { color: themeColors.text }]}>
            $
          </ThemedText>
        </View>
      </View>

      {/* Negotiable Checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        onPress={() => updateDraft("negotiable", !draft.negotiable)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            { borderColor: themeColors.border },
            draft.negotiable && {
              backgroundColor: themeColors.primary,
              borderColor: themeColors.primary,
            },
          ]}
        >
          {draft.negotiable && (
            <CheckIcon size={16} color="#FFF" weight="bold" />
          )}
        </View>
        <ThemedText style={styles.checkboxLabel}>
          {t("sellSection.Negotiable")}
        </ThemedText>
      </TouchableOpacity>

      {/* Discount Section */}
      <View style={styles.fieldSection}>
        <View style={styles.labelRow}>
          <ThemedText style={styles.inputLabel}>
            {" "}
            {t("sellSection.Discount")}
          </ThemedText>
          <ThemedText style={{ color: themeColors.primary }}>*</ThemedText>
        </View>
        <View style={styles.inputWrapper}>
          <ThemedTextInput
            style={[
              styles.input,
              {
                borderColor: themeColors.border,
                backgroundColor: themeColors.card,
              },
            ]}
            value={draft.discountValue}
            onChangeText={(text) => updateDraft("discountValue", text)}
            keyboardType="numeric"
            placeholder="0.00"
          />
          <ThemedText style={[styles.unitText, { color: themeColors.text }]}>
            $
          </ThemedText>
        </View>
      </View>
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
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    height: 44,
  },
  unitText: {
    position: "absolute",
    right: 16,
    fontSize: 18,
    fontWeight: "400",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
});
