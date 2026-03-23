import { useAuth } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Href, Stack, useFocusEffect, useRouter } from "expo-router";
import {
  BookmarkSimpleIcon,
  CaretLeftIcon,
} from "phosphor-react-native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type BookmarkProduct = {
  favoriteId: string;
  id: string;
  [key: string]: any;
};

const BOOKMARKS_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

export default function BookmarksScreen() {
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const [bookmarks, setBookmarks] = useState<BookmarkProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchBookmarks();
      }
    }, [userId]),
  );

  const fetchBookmarks = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getAuthToken(
        getToken,
        "bookmarks fetch",
        BOOKMARKS_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);

      const { data, error } = await authSupabase
        .from("favorites")
        .select(
          `
          id,
          product:products (
            *,
            seller:users (*)
          )
        `,
        )
        .eq("user_id", userId as string)
        .not("product_id", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const extractedProducts = data
        ?.map((item: any) =>
          item.product
            ? {
                ...item.product,
                favoriteId: item.id,
              }
            : null,
        )
        .filter((p: any) => p !== null);

      setBookmarks(extractedProducts || []);
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (item: BookmarkProduct) => {
    if (!userId || removingId) return;

    try {
      setRemovingId(item.id);
      const token = await getAuthToken(
        getToken,
        "bookmark remove",
        BOOKMARKS_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);

      const { error } = await authSupabase
        .from("favorites")
        .delete()
        .eq("id", item.favoriteId)
        .eq("user_id", userId as string);

      if (error) throw error;

      setBookmarks((current) => current.filter((bookmark) => bookmark.id !== item.id));
    } catch (error) {
      console.error("Error removing bookmark:", error);
      Alert.alert("Error", "Failed to remove bookmark.");
    } finally {
      setRemovingId(null);
    }
  };

  const renderProductItem = ({ item }: { item: BookmarkProduct }) => {
    const mainImage = item.images?.[0] || "https://via.placeholder.com/150";

    return (
      <TouchableOpacity
        style={[styles.listItem, { backgroundColor: themeColors.card }]}
        onPress={() => router.push(`/product/${item.id}` as Href)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: mainImage }} style={styles.listImage} />
        <View style={styles.listInfo}>
          <View style={styles.listTopRow}>
            <View style={styles.listTextWrap}>
              <ThemedText style={styles.listTitle} numberOfLines={2}>
                {item.title}
              </ThemedText>
              <ThemedText style={styles.listMetaText}>
                {item.location_name} •{" "}
                {new Date(item.created_at).toLocaleDateString()}
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => handleRemoveBookmark(item)}
              hitSlop={{ bottom: 8, left: 8, right: 8, top: 8 }}
              disabled={removingId === item.id}
              style={styles.unbookmarkBtn}
            >
              {removingId === item.id ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <BookmarkSimpleIcon
                  size={22}
                  color={themeColors.primary}
                  weight="fill"
                />
              )}
            </TouchableOpacity>
          </View>

          <ThemedText
            style={[styles.listPrice, { color: themeColors.primary }]}
          >
            {item.metadata?.currency === "KHR" ? "៛" : "$"}
            {item.price}
          </ThemedText>
        </View>
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
          <CaretLeftIcon size={28} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {t("bookmarks_screen.bookmarks")}
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
            data={bookmarks}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <BookmarkSimpleIcon
                  size={60}
                  color={themeColors.text}
                  weight="thin"
                />
                <ThemedText style={styles.emptyTitle}>
                  {t("bookmarks_screen.no_bookmarks")}
                </ThemedText>
                <ThemedText style={styles.emptySubtitle}>
                  {t("bookmarks_screen.no_bookmarks_subtitle")}
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
    paddingVertical: 16,
    paddingBottom: 40,
  },
  listItem: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  listImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  listInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  listTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  listTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  listPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  listMetaText: {
    fontSize: 12,
    opacity: 0.5,
  },
  unbookmarkBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    minWidth: 28,
    paddingTop: 2,
  },
  emptyState: {
    paddingTop: 100,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    opacity: 0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.3,
    textAlign: "center",
    marginTop: 8,
  },
});
