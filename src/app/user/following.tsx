import { useAuth } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { fetchBlockedUserIds } from "@src/lib/blockedUsers";
import { createClerkSupabaseClient, supabase } from "@src/lib/supabase";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  UserMinusIcon,
  UserPlusIcon,
  UsersIcon,
} from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FollowingScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type: string }>();
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [id, type]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await (type === "followers"
        ? supabase
            .from("follows")
            .select("follower:users!follows_follower_id_fkey(*)")
            .eq("following_id", id)
        : supabase
            .from("follows")
            .select("following:users!follows_following_id_fkey(*)")
            .eq("follower_id", id));

      if (error) throw error;

      let extractedUsers = data.map((item: any) =>
        type === "followers" ? item.follower : item.following,
      );

      if (userId && getToken) {
        const blockedIds = await fetchBlockedUserIds(
          getToken,
          "blocked users follows list",
          { cacheKey: userId },
        );
        if (blockedIds.length) {
          const blockedSet = new Set(blockedIds);
          extractedUsers = extractedUsers.filter(
            (user: any) => user?.id && !blockedSet.has(user.id),
          );
        }
      }

      setUsers(extractedUsers || []);

      if (userId) {
        const { data: followingRows, error: followingError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId);

        if (followingError) throw followingError;

        setFollowingIds((followingRows || []).map((row) => row.following_id));
      }
    } catch (error) {
      console.error("Error fetching follows list:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!userId || targetUserId === userId || togglingId) return;

    try {
      setTogglingId(targetUserId);
      const token = await getAuthToken(getToken, "follows list follow toggle", {
        timeoutMs: 45000,
        retries: 2,
      });
      const authSupabase = createClerkSupabaseClient(token);
      const isCurrentlyFollowing = followingIds.includes(targetUserId);

      if (isCurrentlyFollowing) {
        const { error } = await authSupabase
          .from("follows")
          .delete()
          .eq("follower_id", userId)
          .eq("following_id", targetUserId);

        if (error) throw error;
        setFollowingIds((current) => current.filter((id) => id !== targetUserId));
      } else {
        const { error } = await authSupabase.from("follows").insert({
          follower_id: userId,
          following_id: targetUserId,
        });

        if (error) throw error;
        setFollowingIds((current) => [...current, targetUserId]);
      }
    } catch (error) {
      console.warn("Follows list toggle warning:", error);
    } finally {
      setTogglingId(null);
    }
  };

  const renderUser = ({ item }: { item: any }) => {
    const isCurrentUser = item.id === userId;
    const isFollowing = followingIds.includes(item.id);
    const isBusy = togglingId === item.id;

    return (
    <TouchableOpacity
      style={[styles.userCard, { backgroundColor: themeColors.card }]}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <View style={styles.userInfo}>
        <Image
          source={{ uri: item.avatar_url || "https://via.placeholder.com/150" }}
          style={styles.avatar}
        />
        <ThemedText style={styles.userName}>
          {item.first_name} {item.last_name}
        </ThemedText>
      </View>

      {isCurrentUser ? null : (
        <TouchableOpacity
          style={[
            styles.followButton,
            {
              backgroundColor: isFollowing ? "#F3F4F6" : themeColors.primary,
              opacity: isBusy ? 0.7 : 1,
            },
          ]}
          activeOpacity={0.8}
          onPress={() => toggleFollow(item.id)}
          disabled={isBusy}
        >
          {isFollowing ? (
            <UserMinusIcon size={16} color="#374151" />
          ) : (
            <UserPlusIcon size={16} color="#FFF" />
          )}
          <ThemedText
            style={[
              styles.followButtonText,
              { color: isFollowing ? "#374151" : "#FFF" },
            ]}
          >
            {isBusy
              ? "..."
              : isFollowing
                ? t("public_profile.unfollow")
                : t("public_profile.follow")}
          </ThemedText>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.header, { backgroundColor: themeColors.background }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {type === "followers" ? t("public_profile.followers") : t("public_profile.followings")}
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View
        style={[styles.content, { backgroundColor: themeColors.background }]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={themeColors.primary}
            style={{ marginTop: 40 }}
          />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderUser}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <UsersIcon size={60} color={themeColors.text} />
                <ThemedText style={styles.emptyTitle}>
                  {t("common.noProductsFound")}
                </ThemedText>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  backBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  list: {
    padding: 8,
    gap: 12,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#EEE",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  followButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    paddingTop: 100,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    opacity: 0.3,
  },
});
