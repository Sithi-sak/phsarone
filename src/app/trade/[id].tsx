import { useTradeProducts } from "@/src/context/TradeProductsContext";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Colors } from "@src/constants/Colors";
import useThemeColor from "@src/hooks/useThemeColor";
import { formatPrice } from "@src/types/productTypes";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  CheckCircleIcon,
  InfoIcon,
  MapPinIcon,
  PhoneIcon,
} from "phosphor-react-native";
import React, { useMemo } from "react";
import {
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

export default function TradeProductDetailScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { getProductById } = useTradeProducts();

  const product = getProductById(id as string);

  const conditionLabel = useMemo(() => {
    const conditionKey = product?.condition?.toLowerCase().replace(/\s+/g, "_") || "";
    return t(`condition.${conditionKey}`, {
      defaultValue: t(`conditions.${conditionKey}`, {
        defaultValue: product?.condition || "",
      }),
    });
  }, [product?.condition, t]);

  const provinceDisplay = product?.province
    ? t(`provinces.${product.province}`, { defaultValue: product.province })
    : "-";

  const phoneDisplay =
    product?.telephone
      ?.split(/[\/,]/)
      .map((phone) => phone.trim())
      .filter(Boolean)
      .join(" / ") || "-";

  const ownerName = product?.owner?.name || product?.seller || "-";
  const ownerAvatar = product?.owner?.avatar || "";

  const handleOpenMap = () => {
    if (!product?.coordinates) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${product.coordinates.latitude},${product.coordinates.longitude}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (!product?.telephone) return;
    const primaryPhone = product.telephone.split(/[\/,]/)[0]?.replace(/[^0-9+]/g, "");
    if (!primaryPhone) return;
    Linking.openURL(`tel:${primaryPhone}`);
  };

  if (!product) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <View style={styles.notFoundWrap}>
          <ThemedText>{t("common.product_not_found")}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <StatusBar />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <CaretLeftIcon size={22} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 128 }]}
      >
        <View
          style={[
            styles.imageCard,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          {product.images[0] ? (
            <Image source={{ uri: product.images[0] }} style={styles.heroImage} />
          ) : (
            <View
              style={[
                styles.heroImage,
                { backgroundColor: themeColors.secondaryBackground },
              ]}
            />
          )}
          {conditionLabel ? (
            <View style={styles.conditionBadge}>
              <ThemedText style={styles.conditionText}>{conditionLabel}</ThemedText>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.block,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <View style={styles.titleRow}>
            <ThemedText style={styles.title}>{product.title}</ThemedText>
            <ThemedText style={styles.price}>
              {formatPrice(product.originalPrice ?? 0, "USD")}
            </ThemedText>
          </View>
          <ThemedText style={styles.blockTitle}>{t("productDetail.description")}</ThemedText>
          <ThemedText style={styles.descriptionText}>
            {product.description || "-"}
          </ThemedText>
        </View>

        <View
          style={[
            styles.block,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <ThemedText style={styles.blockTitle}>{t("trade.specifications")}</ThemedText>

          <View style={styles.specRow}>
            <ThemedText style={styles.specLabel}>{t("trade.condition")}</ThemedText>
            <ThemedText style={styles.specValue}>{conditionLabel || "-"}</ThemedText>
          </View>

          <View style={styles.specRow}>
            <ThemedText style={styles.specLabel}>{t("trade.original_price")}</ThemedText>
            <ThemedText style={styles.specValue}>
              {formatPrice(product.originalPrice ?? 0, "USD")}
            </ThemedText>
          </View>

          <View style={styles.specRow}>
            <ThemedText style={styles.specLabel}>{t("trade.location")}</ThemedText>
            <TouchableOpacity onPress={handleOpenMap}>
              <ThemedText style={styles.mapLink}>
                {t("common.view_in_google_map")}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.specRow}>
            <ThemedText style={styles.specLabel}>{t("trade.phone_number")}</ThemedText>
            <TouchableOpacity onPress={handleCall}>
              <ThemedText style={styles.specValue}>{phoneDisplay}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.block,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <ThemedText style={styles.blockTitle}>{t("trade.trade_preferences")}</ThemedText>
          <ThemedText style={styles.subText}>
            {t("trade.trade_preferences_description")}
          </ThemedText>

          <View style={styles.lookingForBox}>
            <ThemedText style={styles.lookingForTitle}>{t("trade.looking_for")}</ThemedText>
            {product.lookingFor.map((item, index) => (
              <View key={`${item.name}-${index}`} style={styles.lookingForItemWrap}>
                <ThemedText style={styles.lookingForItemName}>{item.name}</ThemedText>
                {item.description ? (
                  <View style={styles.lookingForDescRow}>
                    <View style={styles.descAccent} />
                    <ThemedText style={styles.lookingForItemDesc}>{item.description}</ThemedText>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          {product.estimatedTradeValueRange ? (
            <View style={styles.estimatedBox}>
              <ThemedText style={styles.estimatedLabel}>
                $ {t("trade.estimated_trade_value_range_label")}
              </ThemedText>
              <ThemedText style={styles.estimatedValue}>
                {product.estimatedTradeValueRange}
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.block,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <ThemedText style={styles.blockTitle}>{t("trade.owner_information") || "Owner Information"}</ThemedText>
          <View style={styles.ownerRow}>
            {ownerAvatar ? (
              <Image source={{ uri: ownerAvatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: themeColors.secondaryBackground,
                    borderColor: themeColors.border,
                    borderWidth: 1,
                  },
                ]}
              />
            )}

            <View style={styles.ownerMeta}>
              <ThemedText style={styles.ownerName}>{ownerName}</ThemedText>
              {product.owner?.isVerified ? (
                <View style={styles.verifiedRow}>
                  <CheckCircleIcon size={14} color="#14A44D" weight="fill" />
                  <ThemedText style={styles.verifiedText}>
                    {t("productDetail.verifiedSeller")}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.tipBox}>
          <View style={{ backgroundColor: "#FEF9C3", padding: 6, borderRadius: 999 }}>
            <InfoIcon size={18} color="#854D0E" weight="fill" />
          </View>
          <ThemedText style={styles.tipText}>{t("trade.trade_tip")}</ThemedText>
        </View>
      </ScrollView>

      <View
        style={[
          styles.actionBar,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: themeColors.background,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.primaryAction} activeOpacity={0.9}>
          <ThemedText style={styles.primaryActionText}>{t("trade.chat_with_owner") || "Chat with Owner"}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryAction}
          activeOpacity={0.9}
        >
          <ThemedText style={styles.secondaryActionText}>{t("trade.send_trade_offer")}</ThemedText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notFoundWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  imageCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  conditionBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#14A44D",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  conditionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  block: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  price: {
    fontSize: 26,
    fontWeight: "700",
    color: "#E44336",
    lineHeight: 30,
  },
  blockTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginBottom: 10,
  },
  descriptionText: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  subText: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
    marginBottom: 16,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  specLabel: {
    fontSize: 14,
    fontWeight: "400",
    opacity: 0.6,
  },
  specValue: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.9,
    textAlign: "right",
    flexShrink: 1,
  },
  mapLink: {
    fontSize: 14,
    color: "#4B5563",
    textAlign: "right",
    flexShrink: 1,
  },
  lookingForBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    backgroundColor: "#F3F4F6",
  },
  lookingForTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  lookingForItemWrap: {
    marginBottom: 12,
  },
  lookingForItemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  lookingForDescRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  descAccent: {
    width: 2,
    backgroundColor: "#EF4444",
    borderRadius: 2,
  },
  lookingForItemDesc: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
    flex: 1,
  },
  estimatedBox: {
    marginTop: 16,
    borderRadius: 8,
    backgroundColor: "#FEF9C3",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  estimatedLabel: {
    fontSize: 13,
    color: "#854D0E",
    fontWeight: "500",
  },
  estimatedValue: {
    fontSize: 13,
    color: "#854D0E",
    fontWeight: "600",
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 16,
  },
  ownerMeta: {
    flex: 1,
  },
  ownerName: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  verifiedText: {
    fontSize: 13,
    color: "#14A44D",
    fontWeight: "500",
  },
  tipBox: {
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280",
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: "#E44336",
    borderRadius: 24,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 24,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});

