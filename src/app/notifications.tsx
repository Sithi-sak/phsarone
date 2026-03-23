import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { useAuth } from "@clerk/clerk-expo";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import {
  BellSlashIcon,
  CaretLeftIcon,
  ChatCircleTextIcon,
  PackageIcon,
} from "phosphor-react-native";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: any;
  is_read: boolean | null;
  created_at: string | null;
};

const NOTIFICATION_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);
  const hasLoadedForUserRef = useRef<string | null>(null);

  const fetchNotifications = useCallback(
    async (isRefresh = false) => {
      if (!userId || !getToken || isFetchingRef.current) {
        if (!userId) setLoading(false);
        return;
      }

      try {
        isFetchingRef.current = true;
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const token = await getAuthToken(
          getToken,
          "notifications fetch",
          NOTIFICATION_AUTH_OPTIONS,
        );
        const authSupabase = createClerkSupabaseClient(token);
        const { data, error } = await authSupabase
          .from("notifications")
          .select("id, type, title, body, data, is_read, created_at")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setNotifications((data || []) as AppNotification[]);
      } catch (error) {
        console.warn("Notifications fetch warning:", error);
        setNotifications([]);
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [getToken, userId],
  );

  useFocusEffect(
    useCallback(() => {
      if (userId && hasLoadedForUserRef.current !== userId) {
        hasLoadedForUserRef.current = userId;
        fetchNotifications();
      } else if (!userId) {
        hasLoadedForUserRef.current = null;
        setNotifications([]);
        setLoading(false);
      }
    }, [fetchNotifications]),
  );

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  const handleOpenNotification = async (item: AppNotification) => {
    if (!item.is_read) {
      setNotifications((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, is_read: true } : row,
        ),
      );
    }

    try {
      if (userId && getToken && !item.is_read) {
        const token = await getAuthToken(
          getToken,
          "notifications mark read",
          NOTIFICATION_AUTH_OPTIONS,
        );
        const authSupabase = createClerkSupabaseClient(token);
        await authSupabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", item.id)
          .eq("user_id", userId);

        setNotifications((prev) =>
          prev.map((row) =>
            row.id === item.id ? { ...row, is_read: true } : row,
          ),
        );
      }
    } catch (error) {
      console.warn("Notifications mark read warning:", error);
    }

    const data = item.data || {};
    if (data.chatType === "trade" && data.tradeId) {
      router.push({
        pathname: "/chat/trade/[id]",
        params: {
          id: String(data.tradeId),
          conversationId: data.conversationId ? String(data.conversationId) : undefined,
          sellerId: data.sellerId ? String(data.sellerId) : undefined,
        },
      });
      return;
    }

    if (data.chatType === "regular" && data.productId) {
      router.push({
        pathname: "/chat/normal/[id]",
        params: {
          id: String(data.productId),
          conversationId: data.conversationId ? String(data.conversationId) : undefined,
          sellerId: data.sellerId ? String(data.sellerId) : undefined,
        },
      });
    }
  };

  const handleReadAll = async () => {
    const unreadIds = notifications.filter((item) => !item.is_read).map((item) => item.id);
    if (!userId || !getToken || unreadIds.length === 0) return;

    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));

    try {
      const token = await getAuthToken(
        getToken,
        "notifications read all",
        NOTIFICATION_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    } catch (error) {
      console.warn("Notifications read-all warning:", error);
      fetchNotifications(true);
    }
  };

  const handleClearAll = async () => {
    if (!userId || !getToken || notifications.length === 0) return;

    const previous = notifications;
    setNotifications([]);

    try {
      const token = await getAuthToken(
        getToken,
        "notifications clear all",
        NOTIFICATION_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase
        .from("notifications")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      console.warn("Notifications clear-all warning:", error);
      setNotifications(previous);
    }
  };

  const renderIcon = (type: string) => {
    if (type === "trade_offer") {
      return <PackageIcon size={18} color={themeColors.primary} weight="fill" />;
    }
    return <ChatCircleTextIcon size={18} color={themeColors.primary} weight="fill" />;
  };

  const formatTimestamp = (value: string | null) => {
    if (!value) return "";
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.header,
          { backgroundColor: themeColors.background, borderBottomColor: themeColors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>
            {t("notifications_screen.notifications")}
          </ThemedText>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleReadAll}
            disabled={unreadCount === 0}
            style={styles.headerActionBtn}
          >
            <ThemedText
              style={[
                styles.readAllText,
                {
                  color:
                    unreadCount > 0 ? themeColors.tint : themeColors.text + "40",
                },
              ]}
            >
              Read all
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleClearAll}
            disabled={notifications.length === 0}
            style={styles.headerActionBtn}
          >
            <ThemedText
              style={[
                styles.readAllText,
                {
                  color:
                    notifications.length > 0
                      ? themeColors.tint
                      : themeColors.text + "40",
                },
              ]}
            >
              Clear all
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={[styles.content, styles.centerState]}>
          <ActivityIndicator size="small" color={themeColors.tint} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={[styles.content, { backgroundColor: themeColors.background }]}>
          <View style={styles.emptyState}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: themeColors.card, borderColor: themeColors.border },
              ]}
            >
              <BellSlashIcon size={40} color={themeColors.text} />
            </View>
            <ThemedText style={styles.emptyTitle}>
              {t("notifications_screen.no_notifications")}
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {t("notifications_screen.no_notifications_subtitle")}
            </ThemedText>
          </View>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1, backgroundColor: themeColors.background }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor={themeColors.tint}
              colors={[themeColors.tint]}
            />
          }
        >
          {notifications.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: themeColors.background,
                  borderBottomColor: themeColors.border,
                },
              ]}
              activeOpacity={0.85}
              onPress={() => handleOpenNotification(item)}
            >
              <View
                style={[
                  styles.notificationIconWrap,
                  { backgroundColor: `${themeColors.tint}12` },
                ]}
              >
                {renderIcon(item.type)}
              </View>
              <View style={styles.notificationBody}>
                <View style={styles.notificationTopRow}>
                  <ThemedText
                    style={[
                      styles.notificationTitle,
                      { color: themeColors.text },
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </ThemedText>
                  {!item.is_read ? (
                    <View
                      style={[
                        styles.unreadDot,
                        { backgroundColor: themeColors.tint },
                      ]}
                    />
                  ) : null}
                </View>
                <ThemedText
                  style={[
                    styles.notificationText,
                    { color: themeColors.text + "CC" },
                  ]}
                >
                  {item.body}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.notificationTime,
                    { color: themeColors.text + "70" },
                  ]}
                >
                  {formatTimestamp(item.created_at)}
                </ThemedText>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  headerActionBtn: {
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    flexShrink: 1,
  },
  backBtn: {
    padding: 8,
    marginRight: 2,
  },
  readAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerState: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    opacity: 0.8,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: "center",
    lineHeight: 20,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  notificationCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  notificationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBody: {
    flex: 1,
  },
  notificationTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  notificationText: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
  },
  notificationTime: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "400",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
});
