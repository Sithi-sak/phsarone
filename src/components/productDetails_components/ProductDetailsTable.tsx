import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface ProductDetailsTableProps {
  mainCategory: string;
  subCategory: string;
  productDetails: { [key: string]: string };
  activeFont: string;
}

const renderDetailValue = (value: any) => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return "[Complex Object]";
    }
  }
  return String(value);
};

const ProductDetailsTable: React.FC<ProductDetailsTableProps> = ({
  mainCategory,
  subCategory,
  productDetails,
}) => {
  const { t } = useTranslation();
  const themeColors = useThemeColor();

  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionTitle}>
        {t("productDetail.details")}
      </ThemedText>

      <View
        style={[
          styles.descriptionRow,
          { borderBottomColor: themeColors.border },
        ]}
      >
        <ThemedText style={styles.descriptionLabel}>
          {t("productDetail.mainCategory")}
        </ThemedText>
        <ThemedText style={styles.descriptionValue}>
          {mainCategory ? t(`categories.${mainCategory}`, { defaultValue: mainCategory }) : ""}
        </ThemedText>
      </View>

      <View
        style={[
          styles.descriptionRow,
          { borderBottomColor: themeColors.border },
        ]}
      >
        <ThemedText style={styles.descriptionLabel}>
          {t("productDetail.subCategory")}
        </ThemedText>
        <ThemedText style={styles.descriptionValue}>
          {subCategory ? t(`subcategories.${subCategory}`, { defaultValue: subCategory }) : ""}
        </ThemedText>
      </View>

      {/* Dynamic Product Details from POST_FIELDS_MAP */}
      {Object.entries(productDetails).map(([key, value]) => (
        <View
          key={key}
          style={[
            styles.descriptionRow,
            { borderBottomColor: themeColors.border },
          ]}
        >
          <ThemedText style={styles.descriptionLabel}>
            {String(t("fields." + String(key)))}
          </ThemedText>
          <ThemedText style={styles.descriptionValue}>
            {renderDetailValue(value)}
          </ThemedText>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  descriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  descriptionLabel: {
    fontSize: 15,
    opacity: 0.6,
  },
  descriptionValue: {
    fontSize: 15,
    fontWeight: "500",
  },
});

export default ProductDetailsTable;
