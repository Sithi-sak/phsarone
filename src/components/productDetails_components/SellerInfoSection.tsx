import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { Product } from "@src/types/productTypes";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Image,
  Linking,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface SellerInfoSectionProps {
  product: Product;
  onViewProfile?: () => void;
}

const SellerInfoSection: React.FC<SellerInfoSectionProps> = ({
  product,
  onViewProfile,
}) => {
  // Updated destructuring
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  if (!product || !product.contact) {
    return null;
  }

  const handleCall = () => {
    if (product.contact && product.contact.phones.length > 0) {
      const phoneNumber = String(product.contact.phones[0]).replace(/\s/g, "");
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  return (
    <View style={styles.sellerSection}>
      <ThemedText style={styles.sectionTitle}>
        {t("productDetail.sellerInfo")}
      </ThemedText>

      <View style={styles.sellerInfo}>
        {product.seller?.avatar ? (
          <Image
            source={{ uri: product.seller.avatar }}
            style={styles.sellerAvatar}
          />
        ) : (
          <View
            style={[
              styles.sellerAvatar,
              styles.avatarPlaceholder,
              { backgroundColor: themeColors.border + "1A" },
            ]}
          >
            <Ionicons name="person" size={24} color={themeColors.text} />
          </View>
        )}

        <View style={styles.sellerDetails}>
          <View style={styles.sellerNameRow}>
            <ThemedText style={styles.sellerName}>
              {product.contact?.sellerName}
            </ThemedText>
            {product.seller?.verified && (
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={themeColors.info}
              />
            )}
          </View>

          <View style={styles.badgesContainer}>
            {product.seller?.verified && (
              <View style={styles.badge}>
                <Ionicons
                  name="shield-checkmark"
                  size={12}
                  color={themeColors.info}
                />
                <ThemedText
                  style={[styles.badgeText, { color: themeColors.info }]}
                >
                  {t("productDetail.verifiedSeller")}
                </ThemedText>
              </View>
            )}
          </View>

        </View>

        {product.seller && onViewProfile && (
          <TouchableOpacity onPress={onViewProfile}>
            <ThemedText
              style={[styles.viewProfileText, { color: themeColors.link }]}
            >
              {t("productDetail.viewProfile")}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Contact Information */}
      <View
        style={[styles.contactInfo, { borderTopColor: themeColors.border }]}
      >
        {product.contact?.phones &&
          product.contact.phones.map((phone, index) => (
            <View key={index} style={styles.contactRow}>
              <Ionicons
                name="call-outline"
                size={16}
                color={themeColors.text}
              />
              <ThemedText style={styles.contactText}>{phone}</ThemedText>
            </View>
          ))}
        {product.contact?.email && (
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={16} color={themeColors.text} />
            <ThemedText style={styles.contactText}>
              {product.contact.email}
            </ThemedText>
          </View>
        )}
      </View>
    </View>
  );
};

export default SellerInfoSection;

const styles = StyleSheet.create({
  sellerSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  sellerDetails: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  badgesContainer: {
    flexDirection: "column",
    gap: 2,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    opacity: 0.7,
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: "500",
  },
  contactInfo: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    opacity: 0.7,
  },
});
