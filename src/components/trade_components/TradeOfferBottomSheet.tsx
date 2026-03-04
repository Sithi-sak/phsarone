import { useAuth } from "@clerk/clerk-expo";
import { Colors } from "@src/constants/Colors";
import { useTradeProducts } from "@src/context/TradeProductsContext";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { TradeProduct } from "@src/types/productTypes";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [sendingOffer, setSendingOffer] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      // Filter items owned by me that are active
      const owned = allProducts.filter(p => p.owner_id === userId && p.status === 'active');
      setMyItems(owned);
    }
  }, [visible, userId, allProducts]);

  const handleSendOffer = async () => {
    if (!selectedItemId || !userId) return;

    setSendingOffer(true);
    try {
      const token = await getToken();
      const authSupabase = createClerkSupabaseClient(token);
      
      const selectedItem = myItems.find(p => p.id === selectedItemId);

      const { error } = await authSupabase
        .from("trade_offers")
        .insert({
          trade_id: targetTradeId,
          bidder_id: userId,
          offered_trade_id: selectedItemId,
          offered_item_desc: selectedItem?.title || "Trade Item",
          status: "pending",
        });

      if (error) throw error;

      onOfferSent?.();
      onClose();
    } catch (err: any) {
      console.error("Error sending trade offer:", err);
    } finally {
      setSendingOffer(false);
    }
  };

  const handleAddPost = () => {
    onClose();
    router.push({
      pathname: "/trade/AddTradeProductScreen",
      params: { 
        isPrivate: "true", 
        targetUserId: targetOwnerId,
        tradeId: targetTradeId 
      }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: themeColors.card,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: themeColors.border }]} />
          
          <ThemedText style={styles.title}>
            {t("trade.select_item_to_offer")}
          </ThemedText>

          <FlatList
            data={myItems}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.itemRow,
                  {
                    backgroundColor: themeColors.secondaryBackground,
                    borderColor: selectedItemId === item.id ? themeColors.primary : "transparent",
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedItemId(item.id)}
              >
                <Image source={{ uri: item.images[0] }} style={styles.itemImage} />
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
                  <TouchableOpacity style={styles.addPostBtn} onPress={handleAddPost}>
                    <ThemedText style={styles.addPostBtnText}>
                      {t("trade.add_post")}
                    </ThemedText>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { 
                      backgroundColor: selectedItemId ? Colors.blues[500] : "#E5E7EB",
                      opacity: sendingOffer ? 0.7 : 1
                    },
                  ]}
                  disabled={!selectedItemId || sendingOffer}
                  onPress={handleSendOffer}
                >
                  {sendingOffer ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <ThemedText style={[styles.submitBtnText, { color: selectedItemId ? "#fff" : "#9CA3AF" }]}>
                      {t("trade.send_trade_offer")}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    maxHeight: "80%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
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
