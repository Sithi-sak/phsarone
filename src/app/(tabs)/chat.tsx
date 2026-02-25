import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { parseContent } from "@src/utils/chatUtils";
import { formatTimeAgo } from "@src/utils/productUtils";

export default function ChatScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { userId } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"regular" | "trade">("regular");

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
        params: {
          id: String(item.product_id || item.id || ""),
          ...chatParams,
        },
      });
    } else {
      router.push({
        pathname: "/chat/trade/[id]",
        params: {
          id: String(item.id || ""),
          ...chatParams,
        },
      });
    }
  };

  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const otherParticipant =
      userId === item.buyer_id ? item.seller : item.buyer;
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
            lastMessage =
              t("chat.voice") || t("chat.this_voice_message") || "Voice";
            break;
          default:
            lastMessage =
              parsed.text || parsed.message || String(lastMsgContent);
        }
      }
    }

    const timeAgo = item.last_message_at
      ? formatTimeAgo(item.last_message_at, t)
      : "";

    return (
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={() => navigateToChat(item)}
        style={[
          styles.conversationItem,
          { backgroundColor: themeColors.background },
        ]}
      >
        <Image
          source={{
            uri:
              otherParticipant?.avatar_url || "https://via.placeholder.com/150",
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
                isUnread && { fontWeight: "600", color: themeColors.text },
              ]}
              numberOfLines={1}
            >
              {lastMessage}
            </ThemedText>
            {isUnread && (
              <View
                style={[
                  styles.unreadBadge,
                  { backgroundColor: themeColors.tint },
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
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>
          {t("chat.messages")} ({conversations.length})
        </ThemedText>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
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
                ? { color: "white" }
                : { color: "#4B5563" },
            ]}
          >
            {t("chat.regular")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
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
              activeTab === "trade" ? { color: "white" } : { color: "#4B5563" },
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
          renderItem={renderConversationItem}
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
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
  },
  tabText: {
    fontWeight: "600",
    fontSize: 16,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  separator: {
    height: 1,
    marginHorizontal: 20,
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 16,
    backgroundColor: "#374151",
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginRight: 10,
  },
  time: {
    fontSize: 14,
    opacity: 0.4,
  },
  lastMessage: {
    fontSize: 15,
    opacity: 0.5,
    flex: 1,
    marginRight: 10,
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
    fontWeight: "700",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: "center",
    marginTop: 100,
  },
});
