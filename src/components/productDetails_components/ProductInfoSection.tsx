import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { supabase } from "@src/lib/supabase";
import { formatPrice, Product } from "@src/types/productTypes";
import { TFunction } from "i18next";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface ProductInfoSectionProps {
  product: Product;
  discountedPrice?: string;
  timeAgo: string;
  activeFont: string;
  t: TFunction<"translation", undefined>;
}

const ProductInfoSection: React.FC<ProductInfoSectionProps> = ({
  product,
  discountedPrice,
  timeAgo,
}) => {
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    if (product.id) {
      fetchViewCount();
    }
  }, [product.id]);

  const fetchViewCount = async () => {
    try {
      const { count, error } = await supabase
        .from("analytics_views")
        .select("*", { count: "exact", head: true })
        .eq("product_id", product.id);

      if (error) throw error;
      setViewCount(count || 0);
    } catch (error) {
      console.error("Error fetching view count:", error);
    }
  };

  const styles = getStyles(themeColors);

  return (
    <View style={styles.contentContainer}>
      {/* Title and Views */}
      <View style={styles.titleRow}>
        <ThemedText style={styles.productName}>{product.title}</ThemedText>
        <View style={styles.viewsContainer}>
          <Ionicons name="eye-outline" size={16} color={themeColors.text} />
          <ThemedText style={styles.viewsText}>
            {viewCount} {t("productDetail.views")}
          </ThemedText>
        </View>
      </View>

      {/* Time ago */}
      <ThemedText style={styles.timeAgo}>{timeAgo}</ThemedText>

      {/* Price */}
      <View style={styles.priceContainer}>
        {discountedPrice ? (
          <>
            <ThemedText
              style={[styles.originalPrice, { color: themeColors.text + "60" }]}
            >
              {formatPrice(product.price, product.currency)}
            </ThemedText>
            <ThemedText style={styles.price}>
              {formatPrice(discountedPrice, product.currency)}
            </ThemedText>
            <View style={styles.discountBadge}>
              <ThemedText style={styles.discountText}>
                -
                {product.discountType === "percentage"
                  ? `${product.discountValue}%`
                  : formatPrice(product.discountValue || "0", product.currency)}
              </ThemedText>
            </View>
          </>
        ) : (
          <ThemedText style={styles.price}>
            {formatPrice(product.price, product.currency)}
          </ThemedText>
        )}
        {product.negotiable && (
          <View style={styles.negotiableBadge}>
            <ThemedText style={styles.negotiableText}>
              {t("productDetail.negotiable")}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

const getStyles = (themeColors: ReturnType<typeof useThemeColor>) =>
  StyleSheet.create({
    contentContainer: {
      padding: 16,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    productName: {
      fontSize: 24,
      fontWeight: "bold",
      flex: 1,
    },
    viewsContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    viewsText: {
      fontSize: 14,
      opacity: 0.6,
    },
    timeAgo: {
      fontSize: 13,
      opacity: 0.5,
      marginBottom: 8,
    },
    priceContainer: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
    },
    price: {
      fontSize: 28,
      fontWeight: "bold",
      color: themeColors.tint,
    },
    originalPrice: {
      fontSize: 20,
      fontWeight: "500",
      textDecorationLine: "line-through",
    },
    discountBadge: {
      backgroundColor: themeColors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    discountText: {
      color: themeColors.primaryButtonText,
      fontSize: 12,
      fontWeight: "bold",
    },
    negotiableBadge: {
      backgroundColor: themeColors.success + "20",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    negotiableText: {
      color: themeColors.text,
      fontSize: 13,
      fontWeight: "600",
    },
  });

export default ProductInfoSection;
