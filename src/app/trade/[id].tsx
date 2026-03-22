import { useAuth } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import TradeOfferBottomSheet from "@src/components/trade_components/TradeOfferBottomSheet";
import { Colors } from "@src/constants/Colors";
import { useTradeProducts } from "@src/context/TradeProductsContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import {
  buildOpenStreetMapSearchUrl,
  buildOpenStreetMapUrl,
} from "@src/lib/maps";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { formatPrice } from "@src/types/productTypes";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  CheckCircleIcon,
  LightbulbIcon,
} from "phosphor-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TradeProductDetailScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const { t } = useTranslation();
  const { getProductById, refreshProducts } = useTradeProducts();
  const { userId, getToken } = useAuth();

  const [showOfferSheet, setShowOfferSheet] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState<{
    avatar_url?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null>(null);
  const colorScheme = useColorScheme();

  const product = getProductById(id as string);

  useEffect(() => {
    const fetchOwnerProfile = async () => {
      if (!product?.owner_id) {
        setOwnerProfile(null);
        return;
      }

      try {
        const token = await getAuthToken(getToken, "trade owner profile");
        const authSupabase = createClerkSupabaseClient(token);
        const { data, error } = await authSupabase
          .from("users")
          .select("first_name,last_name,avatar_url")
          .eq("id", product.owner_id)
          .maybeSingle();

        if (error) throw error;
        setOwnerProfile(data);
      } catch (error) {
        console.warn("Trade owner profile warning:", error);
        setOwnerProfile(null);
      }
    };

    fetchOwnerProfile();
  }, [getToken, product?.owner_id]);

  const conditionLabel = useMemo(() => {
    const conditionKey =
      product?.condition?.toLowerCase().replace(/\s+/g, "_") || "";
    return t(`condition.${conditionKey}`, {
      defaultValue: t(`conditions.${conditionKey}`, {
        defaultValue: product?.condition || "Excellent",
      }),
    });
  }, [product?.condition, t]);

  const phoneDisplay =
    product?.telephone
      ?.split(/[\/,]/)
      .map((phone) => phone.trim())
      .filter(Boolean)
      .join(" / ") || "012#### / 010####";

  const ownerName = useMemo(() => {
    const fullName = [ownerProfile?.first_name, ownerProfile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fullName) return fullName;
    if (!product?.owner) return "Sarah Chen";
    const name = product.owner.name || product.seller || "";

    // If it's an email address, try to make it look like a username
    if (name.includes("@") && name.includes(".")) {
      return name.split("@")[0];
    }

    return name || "Phsar One User";
  }, [ownerProfile?.first_name, ownerProfile?.last_name, product]);

  const ownerAvatar = ownerProfile?.avatar_url || product?.owner?.avatar || "";
  const isOwner = !!userId && product?.owner_id === userId;

  const handleOpenMap = () => {
    if (!product?.coordinates) {
      Linking.openURL(
        buildOpenStreetMapSearchUrl(product?.location || "Phnom Penh"),
      );
      return;
    }
    const url = buildOpenStreetMapUrl(
      product.coordinates.latitude,
      product.coordinates.longitude,
    );
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (!product?.telephone) return;
    const primaryPhone = product.telephone
      .split(/[\/,]/)[0]
      ?.replace(/[^0-9+]/g, "");
    if (!primaryPhone) return;
    Linking.openURL(`tel:${primaryPhone}`);
  };
  const handleEdit = () => {
    if (!product?.id) return;
    router.push({
      pathname: "/trade/AddTradeProductScreen",
      params: { editId: product.id },
    });
  };

  const handleDelete = () => {
    if (!product?.id) return;

    Alert.alert(t("common.delete"), t("common.confirm_delete"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getAuthToken(getToken, "trade delete");
            const authSupabase = createClerkSupabaseClient(token);
            const { error } = await authSupabase
              .from("trades")
              .delete()
              .eq("id", product.id)
              .eq("owner_id", userId as string);
            if (error) throw error;

            await refreshProducts();
            router.back();
          } catch {
            Alert.alert(
              t("common.error"),
              t("common.failed_to_delete_listing"),
            );
          }
        },
      },
    ]);
  };

  const handleChatWithOwner = () => {
    if (!product?.id || !product.owner_id || isOwner) return;

    router.replace({
      pathname: "/(tabs)/chat",
      params: {
        tab: "trade",
        autoOpen: "trade",
        id: product.id,
        sellerId: product.owner_id,
        sellerName: ownerName,
        sellerAvatar: ownerAvatar,
        productTitle: product.title,
        productThumbnail: product.images?.[0] || "",
        productPrice: String(product.originalPrice ?? ""),
        productCurrency: "USD",
      },
    });
  };

  if (!product) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: themeColors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundWrap}>
          <ThemedText>{t("common.product_not_found")}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      {/* --- Header --- */}
      <View style={[styles.header, { paddingTop: 16 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 140 },
        ]}
      >
        {/* --- Product Image Card --- */}
        <View
          style={[
            styles.imageCard,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border + "40",
            },
          ]}
        >
          {product.images?.[0] ? (
            <Image
              source={{ uri: product.images[0] }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.heroImage,
                { backgroundColor: themeColors.secondaryBackground },
              ]}
            />
          )}
          <View
            style={[
              styles.conditionBadge,
              { backgroundColor: Colors.greens[500] },
            ]}
          >
            <ThemedText style={styles.conditionText}>
              {conditionLabel}
            </ThemedText>
          </View>
        </View>

        {/* --- Title & Description --- */}
        <View
          style={[
            styles.whiteBlock,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border + "30",
            },
          ]}
        >
          <View style={styles.titlePriceRow}>
            <ThemedText style={styles.productTitle}>{product.title}</ThemedText>
            <ThemedText
              style={[styles.productPrice, { color: themeColors.primary }]}
            >
              {formatPrice(product.originalPrice ?? 0, "USD")}
            </ThemedText>
          </View>

          <ThemedText style={styles.sectionLabel}>
            {t("productDetail.description")}
          </ThemedText>
          <ThemedText
            style={[styles.descriptionText, { color: themeColors.text + "99" }]}
          >
            {product.description ||
              "MacBook Pro 2020, 16GB RAM, 512GB SSD. Perfect condition, always used with case."}
          </ThemedText>
        </View>

        {/* --- Specifications --- */}
        <View
          style={[
            styles.whiteBlock,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border + "30",
            },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("trade.specifications")}
          </ThemedText>

          <View style={styles.specLine}>
            <ThemedText
              style={[styles.specLabel, { color: themeColors.text + "80" }]}
            >
              {t("trade.condition")}
            </ThemedText>
            <ThemedText style={styles.specValue}>{conditionLabel}</ThemedText>
          </View>
          <View style={styles.specLine}>
            <ThemedText
              style={[styles.specLabel, { color: themeColors.text + "80" }]}
            >
              {t("trade.original_price")}
            </ThemedText>
            <ThemedText style={styles.specValue}>
              {formatPrice(product.originalPrice ?? 0, "USD")}
            </ThemedText>
          </View>
          <View style={styles.specLine}>
            <ThemedText
              style={[styles.specLabel, { color: themeColors.text + "80" }]}
            >
              {t("trade.location")}
            </ThemedText>
            <TouchableOpacity onPress={handleOpenMap}>
              <ThemedText
                style={[
                  styles.specValue,
                  {
                    color: themeColors.text + "80",
                    textDecorationLine: "none",
                  },
                ]}
              >
                {t("common.view_in_google_map")}
              </ThemedText>
            </TouchableOpacity>
          </View>
          <View style={[styles.specLine, { marginBottom: 0 }]}>
            <ThemedText
              style={[styles.specLabel, { color: themeColors.text + "80" }]}
            >
              {t("trade.phone_number")}
            </ThemedText>
            <TouchableOpacity onPress={handleCall}>
              <ThemedText style={styles.specValue}>{phoneDisplay}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Trade Preferences --- */}
        <View
          style={[
            styles.whiteBlock,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border + "30",
            },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("trade.trade_preferences")}
          </ThemedText>
          <ThemedText
            style={[styles.helperText, { color: themeColors.text + "80" }]}
          >
            {t("trade.trade_preferences_description")}
          </ThemedText>

          <View
            style={[
              styles.lookingForContainer,
              { backgroundColor: themeColors.background },
            ]}
          >
            <ThemedText style={styles.lookingForHeading}>
              {t("trade.looking_for")}
            </ThemedText>

            {product.lookingFor?.length > 0 ? (
              product.lookingFor.map((item, index) => (
                <View key={index} style={styles.lookingForItem}>
                  <ThemedText style={styles.lookingForName}>
                    {item.name}
                  </ThemedText>
                  {item.description && (
                    <View style={styles.lookingForDescRow}>
                      <View
                        style={[
                          styles.accentBar,
                          { backgroundColor: themeColors.primary },
                        ]}
                      />
                      <ThemedText
                        style={[
                          styles.lookingForDesc,
                          { color: themeColors.text + "99" },
                        ]}
                      >
                        {item.description}
                      </ThemedText>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.lookingForItem}>
                <ThemedText style={styles.lookingForName}>
                  Gaming Laptop ROG Zephyrus
                </ThemedText>
                <View style={styles.lookingForDescRow}>
                  <View
                    style={[
                      styles.accentBar,
                      { backgroundColor: themeColors.primary },
                    ]}
                  />
                  <ThemedText
                    style={[
                      styles.lookingForDesc,
                      { color: themeColors.text + "99" },
                    ]}
                  >
                    Preferably with RTX 3060 or higher GPU, 16GB+ RAM, good
                    cooling system
                  </ThemedText>
                </View>
              </View>
            )}
          </View>

          {product.estimatedTradeValueRange && (
            <View style={[styles.rangePill, { backgroundColor: "" }]}>
              <ThemedText
                style={[styles.rangeLabel, { color: Colors.yellows[800] }]}
              >
                {t("trade.estimated_trade_value_range_label")}
              </ThemedText>
              <ThemedText
                style={[styles.rangeValue, { color: Colors.yellows[800] }]}
              >
                {product.estimatedTradeValueRange}
              </ThemedText>
            </View>
          )}
        </View>

        {/* --- Owner Information --- */}
        <View
          style={[
            styles.whiteBlock,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border + "30",
            },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("trade.owner_information")}
          </ThemedText>
          <View style={styles.ownerInfoRow}>
            <Image
              source={
                ownerAvatar
                  ? { uri: ownerAvatar }
                  : require("../../../assets/images/favicon.png")
              }
              style={[
                styles.ownerAvatar,
                { backgroundColor: themeColors.secondaryBackground },
              ]}
            />
            <View style={styles.ownerNameCol}>
              <ThemedText style={styles.ownerNameText}>{ownerName}</ThemedText>
              <View style={styles.verifiedTag}>
                <CheckCircleIcon
                  size={14}
                  color={Colors.greens[500]}
                  weight="fill"
                />
                <ThemedText
                  style={[styles.verifiedLabel, { color: Colors.greens[500] }]}
                >
                  Verified
                </ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* --- Tip --- */}
        <View
          style={[
            styles.tipContainer,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border + "20",
            },
          ]}
        >
          <View
            style={[
              styles.bulbCircle,
              { backgroundColor: Colors.yellows[500] },
            ]}
          >
            <LightbulbIcon size={16} color="#FFF" weight="fill" />
          </View>
          <ThemedText
            style={[styles.tipMessage, { color: themeColors.text + "80" }]}
          >
            {t("trade.trade_tip")}
          </ThemedText>
        </View>
      </ScrollView>

      {/* --- Action Buttons --- */}
      <View
        style={[
          styles.bottomActions,
          {
            backgroundColor: themeColors.card,
          },
        ]}
      >
        {isOwner ? (
          <>
            <TouchableOpacity
              style={[styles.btnChat, { backgroundColor: themeColors.primary }]}
              onPress={handleEdit}
            >
              <ThemedText style={styles.btnTextWhite}>
                {t("listings_screen.edit")}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnOffer,
                { backgroundColor: themeColors.secondaryBackground },
              ]}
              onPress={handleDelete}
            >
              <ThemedText
                style={[styles.btnTextGrey, { color: themeColors.text }]}
              >
                {t("common.delete")}
              </ThemedText>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btnChat, { backgroundColor: themeColors.primary }]}
              onPress={handleChatWithOwner}
            >
              <ThemedText style={styles.btnTextWhite}>
                {t("trade.chat_with_owner")}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnOffer,
                { backgroundColor: themeColors.secondaryBackground },
              ]}
              onPress={() => setShowOfferSheet(true)}
            >
              <ThemedText
                style={[styles.btnTextGrey, { color: themeColors.text }]}
              >
                {t("trade.send_trade_offer")}
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>

      <TradeOfferBottomSheet
        visible={showOfferSheet}
        onClose={() => setShowOfferSheet(false)}
        targetTradeId={id as string}
        targetOwnerId={product.owner_id as string}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: 12,
  },
  notFoundWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageCard: {
    height: 320,
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
    position: "relative",
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  conditionBadge: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
  },
  conditionText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "500",
  },
  whiteBlock: {
    padding: 16,
    borderRadius: 10,
    borderCurve: "continuous",
    marginBottom: 8,
  },
  titlePriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  productTitle: {
    fontSize: 22,
    fontWeight: "600",
    flex: 1,
    marginRight: 10,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  specLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  specLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  specValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 16,
  },
  lookingForContainer: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  lookingForHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  lookingForItem: {
    marginBottom: 4,
  },
  lookingForName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  lookingForDescRow: {
    flexDirection: "row",
    gap: 10,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
  },
  lookingForDesc: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#4B5563",
  },
  rangePill: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: 12,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  rangeValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  ownerInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ownerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: "#F3F4F6",
  },
  ownerNameCol: {
    flex: 1,
  },
  ownerNameText: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 20,
  },
  bulbCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tipMessage: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#6B7280",
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 0,
  },
  btnChat: {
    flex: 1,
    height: 48,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  btnOffer: {
    flex: 1,
    height: 48,
    borderRadius: 99,
    justifyContent: "center",
    alignItems: "center",
  },
  btnTextWhite: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "500",
  },
  btnTextGrey: {
    color: "#000",
    fontSize: 16,
    fontWeight: "500",
  },
});
