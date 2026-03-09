import { useAuth } from "@clerk/clerk-expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  PanResponder,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/src/constants/Colors";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { Conversation, useConversations } from "@src/hooks/useChat";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { parseContent } from "@src/utils/chatUtils";
import { formatTimeAgo } from "@src/utils/productUtils";
import { TrashIcon } from "phosphor-react-native";

const SWIPE_THRESHOLD = -75;
const DELETE_WIDTH = 80;

// ─── Swipeable conversation row ───────────────────────────────────────────────
function SwipeableConversationItem({
  item,
  userId,
  themeColors,
  t,
  onPress,
  onDelete,
}: {
  item: Conversation;
  userId: string | null | undefined;
  themeColors: ReturnType<typeof import("@src/hooks/useThemeColor").default>;
  t: any;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 8 && Math.abs(gestureState.dy) < 20,
      onPanResponderMove: (_, gestureState) => {
        const dx = Math.max(gestureState.dx, -DELETE_WIDTH);
        if (dx <= 0) {
          translateX.setValue(dx);
          deleteOpacity.setValue(Math.min(Math.abs(dx) / DELETE_WIDTH, 1));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < SWIPE_THRESHOLD) {
          // Snap open
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: -DELETE_WIDTH,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
          isOpen.current = true;
        } else {
          // Snap closed
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 100,
              friction: 10,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
          isOpen.current = false;
        }
      },
    }),
  ).current;

  const close = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(deleteOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    isOpen.current = false;
  };

  const handlePress = () => {
    if (isOpen.current) {
      close();
    } else {
      onPress();
    }
  };

  const otherParticipant = userId === item.buyer_id ? item.seller : item.buyer;
  const isUnread = !!(item.unread_count && item.unread_count > 0);

  const lastMsgContent = item.last_message_content;
  let lastMessage = t("chat.start_conversation");

  if (lastMsgContent) {
    const parsed = parseContent(lastMsgContent);
    if (parsed) {
      switch (parsed.type) {
        case "image":
          lastMessage = t("chat.photo") || "Image";
          break;
        case "location":
          lastMessage = t("chat.location") || "Location";
          break;
        case "voice":
          lastMessage = t("chat.voice") || "Voice";
          break;
        default:
          lastMessage = parsed.text || parsed.message || String(lastMsgContent);
      }
    }
  }

  const timeAgo = item.last_message_at
    ? formatTimeAgo(item.last_message_at, t)
    : "";

  return (
    <View style={styles.swipeContainer}>
      {/* Delete action behind */}
      <Animated.View style={[styles.deleteAction, { opacity: deleteOpacity }]}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            close();
            onDelete();
          }}
          activeOpacity={0.8}
        >
          <TrashIcon size={22} color="#fff" weight="fill" />
          <ThemedText style={styles.deleteText}>
            {t("common.delete")}
          </ThemedText>
        </TouchableOpacity>
      </Animated.View>

      {/* Swipeable row */}
      <Animated.View
        style={[
          styles.rowContainer,
          {
            backgroundColor: themeColors.background,
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={handlePress}
          style={styles.conversationItem}
        >
          <Image
            source={{
              uri:
                otherParticipant?.avatar_url ||
                "https://via.placeholder.com/150",
            }}
            style={styles.avatar}
          />
          <View style={styles.content} pointerEvents="none">
            <View style={styles.row}>
              <ThemedText style={styles.name} numberOfLines={1}>
                {otherParticipant?.first_name} {otherParticipant?.last_name}
              </ThemedText>
              <ThemedText style={styles.time}>{timeAgo}</ThemedText>
            </View>
            <View style={styles.row}>
              <ThemedText
                style={[
                  styles.lastMessage,
                  isUnread && { fontWeight: "500", color: themeColors.text },
                ]}
                numberOfLines={1}
              >
                {lastMessage}
              </ThemedText>
              {isUnread && (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: Colors.reds[500] },
                  ]}
                >
                  <ThemedText style={styles.unreadText}>
                    {item.unread_count}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { userId, getToken } = useAuth();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    tab?: string;
    autoOpen?: string;
    id?: string;
    sellerId?: string;
    sellerName?: string;
    sellerAvatar?: string;
    productTitle?: string;
    productThumbnail?: string;
    productPrice?: string;
    productCurrency?: string;
  }>();

  const [activeTab, setActiveTab] = useState<"regular" | "trade">("regular");

  useEffect(() => {
    if (params.tab === "trade") {
      setActiveTab("trade");
    } else if (params.tab === "regular") {
      setActiveTab("regular");
    }

    // Auto-open logic for deep-linking/redirection
    if (params.autoOpen && params.id) {
      const { autoOpen, tab, ...chatParams } = params;

      // Delay slightly to ensure tab state is settled
      const timer = setTimeout(() => {
        if (autoOpen === "trade") {
          router.push({
            pathname: "/chat/trade/[id]",
            params: { id: params.id, ...chatParams },
          });
        } else if (autoOpen === "regular") {
          router.push({
            pathname: "/chat/normal/[id]",
            params: { id: params.id, ...chatParams },
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [params.tab, params.autoOpen, params.id]);

  const { conversations, loading, error, refresh } =
    useConversations(activeTab);

  const navigateToChat = (item: Conversation) => {
    const chatParams = {
      sellerId: String(item.seller_id || ""),
      sellerName:
        `${item.seller?.first_name || ""} ${item.seller?.last_name || ""}`.trim(),
      sellerAvatar: String(item.seller?.avatar_url || ""),
      productTitle: String(item.product?.title || ""),
      productThumbnail: String(item.product?.images?.[0] || ""),
      conversationId: String(item.id || ""),
    };

    if (activeTab === "regular") {
      router.push({
        pathname: "/chat/normal/[id]",
        params: { id: String(item.product_id || item.id || ""), ...chatParams },
      });
    } else {
      router.push({
        pathname: "/chat/trade/[id]",
        params: { id: String(item.id || ""), ...chatParams },
      });
    }
  };

  const handleDelete = (item: Conversation) => {
    Alert.alert(
      t("chat.delete_conversation_title") || "Delete Conversation",
      t("chat.delete_conversation_confirmation") ||
        "Are you sure you want to delete this conversation?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              const authSupabase = createClerkSupabaseClient(token);
              const { error } = await authSupabase
                .from("conversations")
                .delete()
                .eq("id", item.id);
              if (error) throw error;
              refresh();
            } catch (err: any) {
              Alert.alert(
                t("common.error"),
                err.message || t("common.failed_to_delete"),
              );
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>
          {t("chat.messages")}{" "}
          <ThemedText style={styles.headerCount}>
            ({conversations.length})
          </ThemedText>
        </ThemedText>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tab,
            activeTab === "regular"
              ? { backgroundColor: Colors.reds[500] }
              : { backgroundColor: "#E5E7EB" },
          ]}
          onPress={() => setActiveTab("regular")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "regular"
                ? { color: "white", fontWeight: "600" }
                : { color: "#4B5563" },
            ]}
          >
            {t("chat.regular")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tab,
            activeTab === "trade"
              ? { backgroundColor: Colors.reds[500] }
              : { backgroundColor: "#E5E7EB" },
          ]}
          onPress={() => setActiveTab("trade")}
        >
          <ThemedText
            style={[
              styles.tabText,
              activeTab === "trade" ? { color: "white", fontWeight: "600" } : { color: "#4B5563" },
            ]}
          >
            {t("chat.trade")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {loading && !conversations.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={themeColors.tint} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={({ item }) => (
            <SwipeableConversationItem
              item={item}
              userId={userId}
              themeColors={themeColors}
              t={t}
              onPress={() => navigateToChat(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: themeColors.border + "40" },
              ]}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              colors={[themeColors.tint]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <ThemedText>{t("chat.no_conversations")}</ThemedText>
            </View>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerCount: {
    fontSize: 16,
    fontWeight: "400",
    opacity: 0.5,
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 99,
  },
  tabText: {
    fontSize: 16,
  },
  rowContainer: {
    flex: 1,
  },
  swipeContainer: {
    position: "relative",
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: "100%",
    height: "100%",
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  deleteText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  // Row content
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginRight: 14,
    backgroundColor: "#F3F4F6",
  },
  content: { flex: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: { fontSize: 16, fontWeight: "700", flex: 1, marginRight: 10 },
  time: { fontSize: 13, opacity: 0.4 },
  lastMessage: { fontSize: 14, opacity: 0.5, flex: 1, marginRight: 10 },
  unreadBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: { color: "white", fontSize: 11, fontWeight: "700" },
  separator: { height: 1, marginLeft: 84 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyStateContainer: { padding: 40, alignItems: "center", marginTop: 60 },
  listContent: { paddingBottom: 100 },
});
