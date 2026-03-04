import { ThemedText } from "@/src/components/shared_components/ThemedText";
import { Colors } from "@/src/constants/Colors";
import useThemeColor from "@/src/hooks/useThemeColor";
import { Product } from "@/src/types/productTypes";
import { getLocalizedLocationName } from "@/src/utils/locationUtils";
import { formatPrice, formatTimeAgo } from "@/src/utils/productUtils";
import { getOptimizedStorageImageUrl } from "@/src/utils/storageImage";
import { toCamelCase } from "@/src/utils/stringUtils";
import { Ionicons } from "@expo/vector-icons";
import { MapPinIcon } from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export default function ProductCard({ product, onPress }: ProductCardProps) {
  const themeColors = useThemeColor();
  const { t, i18n } = useTranslation();

  const [isFavorite, setIsFavorite] = useState(false);

  const handleFavoritePress = () => {
    setIsFavorite((prev) => !prev);
  };

  const timeAgo = formatTimeAgo(product.createdAt, t);
  const mainImage = getOptimizedStorageImageUrl(
    product.photos[0] || "https://via.placeholder.com/300",
    "card",
  );

  // Calculate if there's a discount
  const hasDiscount = product.discountType && product.discountType !== "none";
  const discountPercentage =
    product.discountType === "percentage" ? product.discountValue : null;

  const localizedCommune = product.address?.commune
    ? getLocalizedLocationName(
        product.address.commune,
        i18n.language,
        "commune",
        product.address.province,
        product.address.district,
      )
    : null;

  const localizedDistrict = product.address?.district
    ? getLocalizedLocationName(
        product.address.district,
        i18n.language,
        "district",
        product.address.province,
        null,
      )
    : null;

  const localizedProvince = product.address?.province
    ? getLocalizedLocationName(
        product.address.province,
        i18n.language,
        "province",
        null,
        null,
      )
    : product.location_name || ""; // Fallback to database location_name

  const fullAddress =
    [localizedCommune, localizedDistrict, localizedProvince]
      .filter(Boolean)
      .join(", ") ||
    localizedProvince ||
    "N/A";
  return (
    <TouchableOpacity
      style={[
        styles.productCard,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Image Container */}
      <View style={styles.imageWrapper}>
        <Image source={{ uri: mainImage }} style={styles.productImage} />

        {/* Discount Badge */}
        {hasDiscount && discountPercentage && (
          <View
            style={[
              styles.discountBadge,
              { backgroundColor: themeColors.tint },
            ]}
          >
            <ThemedText style={styles.discountText}>
              -{discountPercentage}%
            </ThemedText>
          </View>
        )}
      </View>

      {/* Product Info */}
      <View style={styles.productInfo}>
        {/* Title */}
        <ThemedText style={styles.productName} numberOfLines={2}>
          {product.title}
        </ThemedText>

        {/* Location Row */}
        <View style={styles.metaRow}>
          <MapPinIcon size={12} color={themeColors.text} style={styles.icon} />
          <ThemedText style={styles.metaText}>{fullAddress}</ThemedText>
        </View>

        {/* Time Row */}
        <View style={styles.metaRow}>
          <Ionicons
            name="time-outline"
            size={12}
            color={themeColors.text}
            style={styles.icon}
          />
          <ThemedText style={styles.metaText} numberOfLines={1}>
            {timeAgo}
            {product.details?.condition
              ? ` • ${t(`fieldOptions.condition.${toCamelCase(product.details.condition)}`)}`
              : ""}
            {product.details?.year ? ` • ${product.details.year}` : ""}
          </ThemedText>
        </View>

        {/* Price Row */}
        <View style={styles.priceRow}>
          <ThemedText
            style={[styles.productPrice, { color: themeColors.tint }]}
          >
            {formatPrice(product.price, product.currency)}
          </ThemedText>
          {product.negotiable && (
            <View
              style={[
                styles.negotiableBadge,
                { backgroundColor: themeColors.tint + "20" },
              ]}
            >
              <ThemedText
                style={[styles.negotiableText, { color: themeColors.tint }]}
              >
                {t("productDetail.negotiable")}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  productCard: {
    borderRadius: 8,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    height: 140,
    position: "relative",
    backgroundColor: "#f0f0f0",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  discountBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    lineHeight: 14,
  },
  favoriteButton: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    padding: 12,
    paddingBottom: 16,
  },
  productName: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  metaText: {
    fontSize: 11,
    opacity: 0.6,
    marginLeft: 4,
    flex: 1,
    lineHeight: 14,
  },
  icon: {
    opacity: 0.6,
    marginTop: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 6,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "bold",
  },
  negotiableBadge: {
    backgroundColor: Colors.blues[100],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  negotiableText: {
    fontSize: 9,
    color: Colors.blues[700],
    fontWeight: "600",
    lineHeight: 12,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  metaItemContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapPinIcon: {
    marginRight: 2,
  },
});
