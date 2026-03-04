import { useAuth } from "@clerk/clerk-expo";
import {
  Href,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import useThemeColor from "@/src/hooks/useThemeColor";
import {
  Product,
  calculateDiscountPrice,
  formatTimeAgo,
} from "@/src/types/productTypes";
import { CAMBODIA_LOCATIONS } from "@src/constants/CambodiaLocations";
import { CATEGORY_MAP } from "@src/constants/CategoryData";
import { useProductDetails } from "@src/hooks/useProductDetails";
import { createClerkSupabaseClient, supabase } from "@src/lib/supabase";
import { formatProductDetails } from "@src/utils/productUtils";

import BuyerSafetyGuidelines from "@src/components/productDetails_components/BuyerSafetyGuidelines";
import ProductActionButtons from "@src/components/productDetails_components/ProductActionButtons";
import ProductDescription from "@src/components/productDetails_components/ProductDescription";
import ProductDetailsTable from "@src/components/productDetails_components/ProductDetailsTable";
import ProductHeader from "@src/components/productDetails_components/ProductHeader";
import ProductImageGallery from "@src/components/productDetails_components/ProductImageGallery";
import ProductInfoSection from "@src/components/productDetails_components/ProductInfoSection";
import ProductLocation from "@src/components/productDetails_components/ProductLocation";
import SellerInfoSection from "@src/components/productDetails_components/SellerInfoSection";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useConversations } from "@src/hooks/useChat";

// Mapping fixed database UUIDs back to CATEGORY_MAP keys
const UUID_TO_CAT_KEY: Record<string, string> = {
  "10000000-0000-0000-0000-000000000001": "1",
  "20000000-0000-0000-0000-000000000001": "2",
  "30000000-0000-0000-0000-000000000001": "3",
  "40000000-0000-0000-0000-000000000001": "4",
  "50000000-0000-0000-0000-000000000001": "5",
  "60000000-0000-0000-0000-000000000001": "6",
  "70000000-0000-0000-0000-000000000001": "7",
  "80000000-0000-0000-0000-000000000001": "8",
};

export default function ProductDetail() {
  const { id } = useLocalSearchParams();
  const themeColors = useThemeColor();
  const { t, i18n } = useTranslation();
  const { userId, getToken } = useAuth();
  const router = useRouter();

  const [isFavorite, setIsFavorite] = useState(false);
  const { product: rawProduct, loading: productLoading } = useProductDetails(
    id as string,
  );

  // Fetch conversations for this product if owner
  const isOwner = userId === rawProduct?.seller_id;
  const { conversations, loading: conversationsLoading } = useConversations(
    "regular",
    isOwner ? (id as string) : undefined,
  );

  console.log("Debug Auth:", {
    userId,
    sellerId: rawProduct?.seller_id,
    isOwner,
  });

  useFocusEffect(
    useCallback(() => {
      if (id) {
        if (userId) checkIsFavorite();
        logView();
      }
    }, [userId, id]),
  );

  const logView = async () => {
    try {
      // 1. Log for public analytics (always)
      await supabase.from("analytics_views").insert({
        product_id: id as string,
        viewer_id: userId || null,
      });

      // 2. Log for private history (if user logged in)
      if (userId) {
        const token = await getToken();
        const authSupabase = createClerkSupabaseClient(token);

        await authSupabase.from("view_history").upsert(
          {
            user_id: userId as string,
            product_id: id as string,
            viewed_at: new Date().toISOString(),
          },
          { onConflict: "user_id, product_id" },
        );
      }
    } catch (error) {
      console.error("Error logging view:", error);
    }
  };

  const checkIsFavorite = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      const authSupabase = createClerkSupabaseClient(token);
      const { data, error } = await authSupabase
        .from("favorites")
        .select("id")
        .eq("user_id", userId as string)
        .eq("product_id", id as string)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  if (productLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: themeColors.background },
        ]}
      >
        <ActivityIndicator size="small" color="#E44336" />
      </View>
    );
  }

  if (!rawProduct) {
    return (
      <View
        style={[styles.container, { backgroundColor: themeColors.background }]}
      >
        <Stack.Screen
          options={{ title: t("common.product_not_found"), headerShown: false }}
        />
        <ThemedText style={styles.notFoundText}>
          {t("common.product_not_found")}
        </ThemedText>
      </View>
    );
  }

  // Robust category resolution
  const dbCategory = Array.isArray(rawProduct.category)
    ? rawProduct.category[0]
    : rawProduct.category;

  // Try to find the main category key from our constants using the UUID
  const catKey = UUID_TO_CAT_KEY[rawProduct.category_id];
  const mainCatKeyFromId = catKey ? CATEGORY_MAP[catKey]?.nameKey : "";

  const mainCategory =
    rawProduct.metadata?.mainCategory ||
    (dbCategory?.parent ? dbCategory.parent.name_key : dbCategory?.name_key) ||
    mainCatKeyFromId ||
    "";

  const subCategory =
    rawProduct.metadata?.subCategory ||
    (dbCategory?.parent ? dbCategory.name_key : "") ||
    "";

  const product: Product = {
    ...rawProduct,
    id: rawProduct.id,
    photos: rawProduct.images || [],
    createdAt: rawProduct.created_at,
    negotiable: rawProduct.is_negotiable,
    currency: rawProduct.metadata?.currency || "USD",
    mainCategory,
    subCategory,
    address: {
      province: rawProduct.location_name || "",
      district: rawProduct.metadata?.district || "",
      commune: rawProduct.metadata?.commune || "",
    },
    location: rawProduct.metadata?.location || { latitude: 0, longitude: 0 },
    details: rawProduct.metadata || {},
    contact: {
      sellerName: rawProduct.seller?.first_name || "Unknown",
      phones: rawProduct.seller?.phone ? [rawProduct.seller.phone] : [],
      email: rawProduct.seller?.email || "",
    },
    seller: {
      id: rawProduct.seller?.id,
      name: rawProduct.seller?.first_name || "Seller",
      avatar: rawProduct.seller?.avatar_url,
      verified: true,
      trusted: true,
      rating: 5.0,
      totalListings: 1,
    },
  };

  const handleShare = () => {
    console.log("Sharing product...");
  };

  const handleFavorite = async () => {
    if (!userId) {
      Alert.alert(
        t("common.sign_in_required"),
        t("common.sign_in_to_bookmark"),
      );
      return;
    }

    try {
      const token = await getToken();
      const authSupabase = createClerkSupabaseClient(token);

      if (isFavorite) {
        // Remove bookmark
        const { error } = await authSupabase
          .from("favorites")
          .delete()
          .eq("user_id", userId as string)
          .eq("product_id", id as string);

        if (error) throw error;
        setIsFavorite(false);
      } else {
        // Add bookmark (using upsert to gracefully handle potential duplicates)
        const { error } = await authSupabase
          .from("favorites")
          .upsert(
            { user_id: userId as string, product_id: id as string },
            { onConflict: "user_id, product_id" },
          );

        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      // Even if it fails, refresh the status to be sure
      checkIsFavorite();
    }
  };

  const handleCall = () => {
    if (product.contact.phones.length > 0) {
      const phoneNumber = String(product.contact.phones[0]).replace(/\s/g, "");
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  // Simplified handleChat to only support normal chat
  const handleChat = (
    conversationId?: string | null,
    buyerId?: string | null,
    buyerName?: string | null,
    buyerAvatar?: string | null,
  ) => {
    const chatParams = {
      sellerId: String(product.seller?.id || ""),
      sellerName: String(buyerName || product.seller?.name || ""),
      sellerAvatar: String(buyerAvatar || product.seller?.avatar || ""),
      productTitle: String(product.title || ""),
      productThumbnail: String(product.photos?.[0] || ""),
      productPrice: String(product.price || ""),
      productCurrency: String(product.currency || ""),
      conversationId: conversationId || undefined,
    };

    const path = `/chat/normal/${product.id}` as any;
    router.push({
      pathname: path,
      params: chatParams,
    });
  };

  const handleEdit = () => {
    router.push(`/sell/details?editId=${product.id}` as Href);
  };

  const handleDelete = async () => {
    Alert.alert(t("common.delete"), t("common.confirm_delete"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getToken();
            const authSupabase = createClerkSupabaseClient(token);
            const { error } = await authSupabase
              .from("products")
              .delete()
              .eq("id", product.id);
            if (error) throw error;
            router.replace("/(tabs)");
          } catch (err) {
            Alert.alert(
              t("common.error"),
              t("common.failed_to_delete_listing"),
            );
          }
        },
      },
    ]);
  };

  const getLocalizedLocationName = (
    englishName: string | null | undefined,
    currentLanguage: string,
    level: "province" | "district" | "commune",
    provinceNameEn?: string | null,
    districtNameEn?: string | null,
  ): string | null => {
    if (!englishName) return null;
    const findLocalizedName = (
      locationArray: any[] | undefined,
      targetEnName: string,
    ) => {
      if (!locationArray) return null;
      const found = locationArray.find((item) => item.name_en === targetEnName);
      return found
        ? currentLanguage === "kh"
          ? found.name_km
          : found.name_en
        : null;
    };
    if (level === "province")
      return findLocalizedName(CAMBODIA_LOCATIONS, englishName);
    if (level === "district" && provinceNameEn) {
      const province = CAMBODIA_LOCATIONS.find(
        (p) => p.name_en === provinceNameEn,
      );
      return findLocalizedName(province?.subdivisions, englishName);
    }
    if (level === "commune" && provinceNameEn && districtNameEn) {
      const province = CAMBODIA_LOCATIONS.find(
        (p) => p.name_en === provinceNameEn,
      );
      const district = province?.subdivisions?.find(
        (d) => d.name_en === districtNameEn,
      );
      return findLocalizedName(district?.subdivisions, englishName);
    }
    return null;
  };

  const activeFont =
    i18n.language === "kh" ? undefined : "MiSansLatin-Normal";
  const productDetails = formatProductDetails(
    product.subCategory,
    product.details,
  );
  const discountedPrice = calculateDiscountPrice(product);
  const formattedDiscountedPrice =
    discountedPrice !== null ? String(discountedPrice) : undefined;

  const localizedCommune = getLocalizedLocationName(
    product.address.commune,
    i18n.language,
    "commune",
    product.address.province,
    product.address.district,
  );
  const localizedDistrict = getLocalizedLocationName(
    product.address.district,
    i18n.language,
    "district",
    product.address.province,
  );
  const localizedProvince = getLocalizedLocationName(
    product.address.province,
    i18n.language,
    "province",
  );

  const fullAddress =
    [localizedCommune, localizedDistrict, localizedProvince]
      .filter(Boolean)
      .join(", ") || "N/A";
  const timeAgo = formatTimeAgo(product.createdAt, t);

  console.log("Render Cycle isOwner:", isOwner);

  return (
    <SafeAreaView
      edges={["top"]}
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ProductHeader
        onShare={handleShare}
        onFavorite={handleFavorite}
        isFavorite={isFavorite}
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 100 }} // Space for sticky footer
          showsVerticalScrollIndicator={false}
        >
          <ProductImageGallery photos={product.photos} />

          <ProductInfoSection
            product={product}
            discountedPrice={formattedDiscountedPrice}
            timeAgo={timeAgo}
            activeFont={activeFont}
            t={t}
          />

          {/* Location */}
          <ProductLocation
            fullAddress={fullAddress}
            location={product.location}
          />

          {/* Description */}
          <ProductDescription
            description={product.description}
            activeFont={activeFont}
          />

          {/* Product Details */}
          <ProductDetailsTable
            mainCategory={product.mainCategory}
            subCategory={product.subCategory}
            productDetails={productDetails}
            activeFont={activeFont}
          />

          <SellerInfoSection
            product={product}
            onViewProfile={() =>
              router.push(`/user/${product.seller?.id}` as Href)
            }
          />

          <BuyerSafetyGuidelines />
        </ScrollView>

        {/* Sticky Footer */}
        <View
          style={[
            styles.stickyFooter,
            { backgroundColor: themeColors.background },
          ]}
        >
          <ProductActionButtons
            isOwner={isOwner}
            onCallSeller={handleCall}
            onChatSeller={() => handleChat()}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  notFoundText: {
    textAlign: "center",
    marginTop: 50,
  },
  ownerChatsSection: {
    padding: 16,
    borderTopWidth: 8,
    borderTopColor: "rgba(0,0,0,0.03)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  ownerChatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
    backgroundColor: "transparent", // Ensure touches are caught
  },
  buyerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eee",
  },
  buyerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  lastMsg: {
    fontSize: 14,
    opacity: 0.5,
    marginTop: 2,
  },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    elevation: 10,
  },
});
