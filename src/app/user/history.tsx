import { useAuth } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Href, Stack, useFocusEffect, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  ClockCounterClockwiseIcon,
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

export default function HistoryScreen() {
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const themeColors = useThemeColor();
  const [history, setHistory] = useState<any[]>([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchHistory();
      }
    }, [userId]),
  );

  const fetchHistory = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const authSupabase = createClerkSupabaseClient(token);

      const { data, error } = await authSupabase
        .from("view_history")
        .select(
          `
          id,
          viewed_at,
          product:products (
            *,
            seller:users (*)
          )
        `,
        )
        .eq("user_id", userId as string)
        .not("product_id", "is", null)
        .order("viewed_at", { ascending: false });

      if (error) throw error;

      const extractedHistory = data
        ?.map((item: any) => ({
          ...item.product,
          viewed_at: item.viewed_at,
        }))
        .filter((p: any) => p !== null);

      setHistory(extractedHistory || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    Alert.alert(
      t("user_actions.clear_history_title"),
      t("user_actions.clear_history_confirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("user_actions.clear_all"),
          style: "destructive",
          onPress: async () => {
            try {
              const token = await getToken();
              const authSupabase = createClerkSupabaseClient(token);
              const { error } = await authSupabase
                .from("view_history")
                .delete()
                .eq("user_id", userId as string);

              if (error) throw error;
              setHistory([]);
            } catch (err) {
              Alert.alert(t("error"), "Failed to clear history.");
            }
          },
        },
      ],
    );
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const mainImage = item.images?.[0] || "https://via.placeholder.com/150";
    const sellerName =
      `${item.seller?.first_name || ""} ${item.seller?.last_name || ""}`.trim() ||
      "Unknown Seller";

    return (
      <TouchableOpacity
        style={[styles.listItem, { backgroundColor: themeColors.card }]}
        onPress={() => router.push(`/product/${item.id}` as Href)}
        activeOpacity={0.7}
      >
        <Image source={{ uri: mainImage }} style={styles.listImage} />
        <View style={styles.listInfo}>
          <View style={styles.infoTop}>
            <ThemedText style={styles.listTitle} numberOfLines={1}>
              {item.title}
            </ThemedText>
            <ThemedText style={styles.listPrice}>
              {item.metadata?.currency === "KHR" ? "៛" : "$"}
              {item.price}
            </ThemedText>
          </View>

          <ThemedText style={styles.listMetaText}>
            {sellerName} • {item.views || 0} •{" "}
            {new Date(item.viewed_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
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
          {t("user_actions.history")}
        </ThemedText>
        <TouchableOpacity onPress={handleClearHistory} style={styles.clearBtn}>
          <ThemedText
            style={[styles.clearBtnText, { color: themeColors.primary }]}
          >
            {t("user_actions.clear_all")}
          </ThemedText>
        </TouchableOpacity>
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
            data={history}
            keyExtractor={(item, index) => item.id + index}
            renderItem={renderHistoryItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ClockCounterClockwiseIcon
                  size={60}
                  color={themeColors.text}
                  weight="light"
                />
                <ThemedText style={styles.emptyTitle}>
                  {t("user_actions.no_history")}
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
  clearBtn: {
    paddingHorizontal: 12,
  },
  clearBtnText: {
    fontWeight: "600",
    fontSize: 14,
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
    borderRadius: 8,
    borderCurve: "continuous",
    overflow: "hidden",
    padding: 8,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  listImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: "#F3F4F6",
  },
  listInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "flex-start",
  },
  infoTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  listPrice: {
    fontSize: 16,
    fontWeight: "700",
  },
  listMetaText: {
    fontSize: 12,
    opacity: 0.5,
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
