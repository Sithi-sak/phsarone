import { useAuth } from "@clerk/clerk-expo";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Href, Stack, useRouter } from "expo-router";
import { CaretLeftIcon, ProhibitInsetIcon } from "phosphor-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

const BLOCKED_USERS_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

type BlockedUserRow = {
  blocked_id: string;
  blocked: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    user_type: string | null;
  } | null;
};

export default function BlockedUsersScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [errorVisible, setErrorVisible] = useState(false);
  const isFetchingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchBlockedUsers = useCallback(async (isRefreshing = false) => {
    if (isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await getAuthToken(
        getToken,
        "blocked users settings fetch",
        BLOCKED_USERS_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);
      const { data, error } = await authSupabase
        .from("blocked_users")
        .select(
          "blocked_id, blocked:users!blocked_users_blocked_id_fkey(id, first_name, last_name, avatar_url, user_type)",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBlockedUsers((data || []) as BlockedUserRow[]);
    } catch (error) {
      console.warn("Blocked users fetch warning:", error);
      setErrorVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [getToken]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  const handleUnblock = async (blockedId: string) => {
    try {
      setUnblockingId(blockedId);
      const token = await getAuthToken(
        getToken,
        "blocked users settings unblock",
        BLOCKED_USERS_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase
        .from("blocked_users")
        .delete()
        .eq("blocked_id", blockedId);

      if (error) throw error;

      setBlockedUsers((current) =>
        current.filter((item) => item.blocked_id !== blockedId),
      );
    } catch (error) {
      console.warn("Blocked users unblock warning:", error);
      setErrorVisible(true);
    } finally {
      setUnblockingId(null);
    }
  };

  const renderItem = ({ item }: { item: BlockedUserRow }) => {
    const blocked = item.blocked;
    const displayName =
      `${blocked?.first_name || ""} ${blocked?.last_name || ""}`.trim() ||
      t("blocked_users.blocked_seller");

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: themeColors.card }]}
        activeOpacity={0.8}
        onPress={() => router.push((`/user/${item.blocked_id}` as Href))}
      >
        <View style={styles.userRow}>
          {blocked?.avatar_url ? (
            <Image source={{ uri: blocked.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.border }]}>
              <ThemedText style={styles.avatarInitial}>
                {displayName[0]?.toUpperCase() || "?"}
              </ThemedText>
            </View>
          )}
          <View style={styles.userTextWrap}>
            <ThemedText style={styles.userName}>{displayName}</ThemedText>
            <ThemedText style={[styles.userType, { color: themeColors.text + "88" }]}>
              {blocked?.user_type
                ? t("blocked_users.account_type", { type: blocked.user_type })
                : t("blocked_users.hidden_copy")}
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.unblockButton,
            { backgroundColor: Colors.reds[500], opacity: unblockingId === item.blocked_id ? 0.7 : 1 },
          ]}
          onPress={() => handleUnblock(item.blocked_id)}
          disabled={unblockingId === item.blocked_id}
        >
          <ThemedText style={styles.unblockButtonText}>
            {unblockingId === item.blocked_id
              ? t("blocked_users.unblocking")
              : t("blocked_users.unblock")}
          </ThemedText>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{t("blocked_users.title")}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.blocked_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchBlockedUsers(true)}
              tintColor={themeColors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: "#FEECE9" }]}>
                <ProhibitInsetIcon size={24} color="#B42318" weight="fill" />
              </View>
              <ThemedText style={styles.emptyTitle}>{t("blocked_users.empty_title")}</ThemedText>
              <ThemedText style={[styles.emptyCopy, { color: themeColors.text + "88" }]}>
                {t("blocked_users.empty_copy")}
              </ThemedText>
            </View>
          }
        />
      )}

      <ActionStatusModal
        visible={errorVisible}
        hideHeaderTone
        tone="error"
        title={t("blocked_users.error_title")}
        description={t("blocked_users.error_description")}
        actionLabel={t("common.ok")}
        onClose={() => setErrorVisible(false)}
      />
    </SafeAreaView>
  );
}

const Colors = {
  reds: {
    500: "#F04438",
  },
};

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  centerWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  listContent: {
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  userRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    marginRight: 12,
  },
  avatar: {
    borderRadius: 28,
    height: 56,
    width: 56,
  },
  avatarPlaceholder: {
    alignItems: "center",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    opacity: 0.5,
  },
  userTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    fontWeight: "700",
  },
  userType: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  unblockButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  unblockButtonText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  emptyIconWrap: {
    alignItems: "center",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    marginBottom: 16,
    width: 52,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyCopy: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
