import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { ClockIcon, MapPinIcon } from "phosphor-react-native";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

interface TradeProduct {
  id: string;
  image: string;
  title: string;
  seller: string;
  timeAgo: string;
  location: string;
  lookingFor: string[];
  condition: string;
}

interface TradeProductCardProps {
  product: TradeProduct;
  onPress: () => void;
}

export default function TradeProductCard({
  product,
  onPress,
}: TradeProductCardProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  const styles = getStyles(themeColors);
  const conditionKey = product.condition.toLowerCase().replace(/\s+/g, "_");
  const conditionLabel = t(`condition.${conditionKey}`, {
    defaultValue: product.condition,
  });
  const sellerPrefix = t("trade.by_seller", { defaultValue: "By" }).trim();
  const normalizedSeller = product.seller.trim().toLowerCase();
  const lowerPrefix = sellerPrefix.toLowerCase();
  const sellerLabel =
    normalizedSeller.startsWith("by ") ||
    normalizedSeller.startsWith(`${lowerPrefix} `)
      ? product.seller
      : `${sellerPrefix} ${product.seller}`;

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.imageWrapper}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        {product.condition ? (
          <View style={styles.conditionBadge}>
            <ThemedText style={styles.conditionText} numberOfLines={1}>
              {conditionLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.infoContainer}>
        <ThemedText style={styles.productTitle} numberOfLines={1}>
          {product.title}
        </ThemedText>
        <ThemedText style={styles.sellerText} numberOfLines={1}>
          {sellerLabel}
        </ThemedText>

        <View style={styles.metaRow}>
          <ClockIcon size={12} color={themeColors.text} />
          <ThemedText style={styles.metaText} numberOfLines={1}>
            {product.timeAgo}
          </ThemedText>
          <MapPinIcon
            size={12}
            color={themeColors.text}
            style={styles.locationIcon}
          />
          <ThemedText style={styles.metaText} numberOfLines={1}>
            {product.location}
          </ThemedText>
        </View>

        <View style={styles.lookingForContainer}>
          <ThemedText style={styles.lookingForLabel} numberOfLines={1}>
            {t("trade.looking_for")}
          </ThemedText>
          <ThemedText style={styles.lookingForText} numberOfLines={2}>
            {product.lookingFor.filter(Boolean).join(", ")}
          </ThemedText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const getStyles = (themeColors: ReturnType<typeof useThemeColor>) =>
  StyleSheet.create({
    cardContainer: {
      borderRadius: 8,
      borderCurve: "continuous",
      overflow: "hidden",
      marginBottom: 12,
      flex: 1,
    },
    imageWrapper: {
      height: 128,
      width: "100%",
      backgroundColor: themeColors.secondaryBackground,
      position: "relative",
    },
    imagePlaceholder: {
      flex: 1,
      backgroundColor: themeColors.secondaryBackground,
    },
    productImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    conditionBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: "#E23A2E",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      maxWidth: "65%",
    },
    conditionText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "700",
      lineHeight: 12,
    },
    infoContainer: {
      padding: 8,
    },
    productTitle: {
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 22,
      marginBottom: 2,
    },
    sellerText: {
      fontSize: 12,
      opacity: 0.6,
      marginBottom: 8,
      lineHeight: 16,
    },
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 4,
    },
    metaText: {
      fontSize: 11,
      opacity: 0.7,
      lineHeight: 14,
      flexShrink: 1,
    },
    locationIcon: {
      marginLeft: 4,
    },
    lookingForContainer: {
      backgroundColor: themeColors.secondaryBackground,
      borderRadius: 8,
      padding: 8,
    },
    lookingForLabel: {
      fontSize: 10,
      opacity: 0.6,
      marginBottom: 2,
      lineHeight: 12,
    },
    lookingForText: {
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 16,
    },
  });
