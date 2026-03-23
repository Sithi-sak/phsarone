import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@src/constants/Colors";
import { useTradeProducts } from "@src/context/TradeProductsContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createNotification } from "@src/lib/notificationCenter";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { TradeProduct } from "@src/types/productTypes";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "../shared_components/ThemedText";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface TradeOfferBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  targetTradeId: string;
  targetOwnerId: string;
  onOfferSent?: () => void;
}

export default function TradeOfferBottomSheet({
  visible,
  onClose,
  targetTradeId,
  targetOwnerId,
  onOfferSent,
}: TradeOfferBottomSheetProps) {
  const { t } = useTranslation();
  const themeColors = useThemeColor();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const { products: allProducts } = useTradeProducts();

  const [myItems, setMyItems] = useState<TradeProduct[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sendingOffer, setSendingOffer] = useState(false);

  // Use a fixed value for animation to ensure reliability
  const slideAnim = useRef(new Animated.Value(600)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(600);
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();

      if (userId) {
        const owned = allProducts.filter(
          (p) => p.owner_id === userId && p.status === "active",
        );
        setMyItems(owned);
      }
    }
  }, [visible, userId, allProducts]);

  const handleClose = (callback?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 600,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      if (callback) callback();
    });
  };

  const handleSendOffer = async () => {
    if (!selectedItemId || !userId) return;
    if (targetOwnerId === userId) {
      Alert.alert(t("common.error"), "You cannot send a trade offer to your own listing.");
      return;
    }

    setSendingOffer(true);
    try {
      const token = await getAuthToken(getToken, "trade offer create");
      const authSupabase = createClerkSupabaseClient(token);

      const selectedItem = myItems.find((p) => p.id === selectedItemId);

      const { error } = await authSupabase.from("trade_offers").insert({
        trade_id: targetTradeId,
        bidder_id: userId,
        offered_trade_id: selectedItemId,
        offered_item_desc: selectedItem?.title || "Trade Item",
        status: "pending",
      });

      if (error) throw error;

      const targetTrade = allProducts.find((p) => p.id === targetTradeId);
      const sellerName =
        targetTrade?.owner?.name || targetTrade?.seller || "Trade Seller";
      const sellerAvatar = targetTrade?.owner?.avatar || "";
      const productTitle = targetTrade?.title || "";
      const productThumbnail = targetTrade?.images?.[0] || "";
      const productPrice = String(targetTrade?.originalPrice ?? "");

      const { data: existingConversation, error: findConversationError } =
        await authSupabase
          .from("conversations")
          .select("id")
          .eq("trade_id", targetTradeId)
          .eq("seller_id", targetOwnerId)
          .eq("buyer_id", userId)
          .maybeSingle();

      if (findConversationError) throw findConversationError;

      let conversationId = existingConversation?.id;

      if (!conversationId) {
        const { data: newConversation, error: createConversationError } =
          await authSupabase
            .from("conversations")
            .insert({
              trade_id: targetTradeId,
              seller_id: targetOwnerId,
              buyer_id: userId,
            })
            .select("id")
            .single();

        if (createConversationError) throw createConversationError;
        conversationId = newConversation.id;
      }

      if (!conversationId) {
        throw new Error("Failed to create trade conversation.");
      }

      const { error: messageError } = await authSupabase.from("messages").insert({
        conversations_id: conversationId,
        sender_id: userId,
        content: {
          type: "trade_offer",
          offeredItemId: selectedItemId,
          offeredItemTitle: selectedItem?.title || "Trade Item",
          offeredItemImage: selectedItem?.images?.[0] || "",
          offeredItemPrice:
            selectedItem?.originalPrice != null
              ? `$${selectedItem.originalPrice}`
              : undefined,
          targetTradeId,
          targetTradeTitle: targetTrade?.title || "",
          message: `Trade offer sent: ${selectedItem?.title || "Trade Item"}`,
        },
      });

      if (messageError) throw messageError;

      await createNotification(authSupabase, {
        userId: targetOwnerId,
        type: "trade_offer",
        title: "New trade offer",
        body: `${selectedItem?.title || "Trade Item"} was offered for your trade listing.`,
        data: {
          conversationId,
          chatType: "trade",
          tradeId: targetTradeId,
          sellerId: targetOwnerId,
        },
      });

      // CRITICAL: Close this bottom sheet modal first
      handleClose(() => {
        // Dismiss all current modals (like the Trade Detail screen)
        router.dismissAll();
        
        // Navigate to the main Chat tab and provide auto-open instructions
        router.replace({
          pathname: "/(tabs)/chat",
          params: {
            tab: "trade",
            autoOpen: "trade",
            id: targetTradeId,
            sellerId: targetOwnerId,
            sellerName,
            sellerAvatar,
            productTitle,
            productThumbnail,
            productPrice,
            productCurrency: "USD",
            conversationId,
          }
        });
        
        onOfferSent?.();
      });
    } catch (err: any) {
      console.error("Error sending trade offer:", err);
      setSendingOffer(false);
    }
  };

  const handleAddPost = () => {
    handleClose(() => {
      router.push({
        pathname: "/trade/AddTradeProductScreen",
        params: {
          isPrivate: "true",
          targetUserId: targetOwnerId,
          tradeId: targetTradeId,
        },
      });
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => handleClose()}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={() => handleClose()}>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: themeColors.card,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Internal Pressable to prevent clicks on sheet from closing it */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <View
                style={[styles.handle, { backgroundColor: themeColors.border }]}
              />
              <ThemedText style={styles.title}>
                {t("trade.select_item_to_offer")}
              </ThemedText>
            </View>

            <FlatList
              data={myItems}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: Math.max(insets.bottom, 24),
              }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.itemRow,
                    {
                      backgroundColor: themeColors.secondaryBackground,
                      borderColor:
                        selectedItemId === item.id
                          ? themeColors.primary
                          : "transparent",
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setSelectedItemId(item.id)}
                >
                  <Image
                    source={{ uri: item.images[0] }}
                    style={styles.itemImage}
                  />
                  <ThemedText style={styles.itemName} numberOfLines={1}>
                    {item.title}
                  </ThemedText>
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <View style={styles.footer}>
                  <View style={styles.addPostRow}>
                    <ThemedText style={styles.addPostText}>
                      {t("trade.dont_have_item_listed")}
                    </ThemedText>
                    <TouchableOpacity
                      style={styles.addPostBtn}
                      onPress={handleAddPost}
                    >
                      <ThemedText style={styles.addPostBtnText}>
                        {t("trade.add_post")}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      {
                        backgroundColor: selectedItemId
                          ? Colors.blues[500]
                          : "#E5E7EB",
                        opacity: sendingOffer ? 0.7 : 1,
                      },
                    ]}
                    disabled={!selectedItemId || sendingOffer}
                    onPress={handleSendOffer}
                  >
                    {sendingOffer ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <ThemedText
                        style={[
                          styles.submitBtnText,
                          { color: selectedItemId ? "#fff" : "#9CA3AF" },
                        ]}
                      >
                        {t("trade.send_trade_offer")}
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              }
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    width: "100%",
  },
  header: {
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  list: {
    flexGrow: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  footer: {
    marginTop: 10,
  },
  addPostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  addPostText: {
    fontSize: 14,
    opacity: 0.8,
  },
  addPostBtn: {
    borderWidth: 1,
    borderColor: "#E44336",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  addPostBtnText: {
    color: "#E44336",
    fontSize: 14,
    fontWeight: "600",
  },
  submitBtn: {
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
