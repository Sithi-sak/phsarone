import { useAuth } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { formatPrice, formatTimeAgo } from "@src/utils/productUtils";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowsClockwiseIcon,
  ArrowsCounterClockwiseIcon,
  CaretLeftIcon,
  ChatTeardropTextIcon,
  EyeIcon,
  PauseIcon,
  PencilSimpleIcon,
  RocketLaunchIcon,
  TrashIcon,
  WarningCircleIcon,
} from "phosphor-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MyListingsScreen() {
  const { userId, getToken } = useAuth();
  const { status } = useLocalSearchParams<{ status: string }>(); // 'active', 'sold', 'draft', 'expired'
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const router = useRouter();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyProducts = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const token = await getToken();
      const authSupabase = createClerkSupabaseClient(token);

      console.log(`Current User ID: ${userId}`);
      console.log(`Fetching products for status: ${status || "active"}`);

      const { data, error } = await authSupabase
        .from("products")
        .select("*")
        .eq("seller_id", userId)
        .eq("status", status || "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log(`Found ${data?.length || 0} products`);
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching my products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyProducts();
  }, [userId, status]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMyProducts();
    setRefreshing(false);
  }, [userId, status]);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const token = await getToken();
      const authSupabase = createClerkSupabaseClient(token);

      const { error } = await authSupabase
        .from("products")
        .update({ status: newStatus })
        .eq("id", id);

      if (!error) fetchMyProducts();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t("common.delete") || "Delete",
      t("common.confirm_delete") ||
        "Are you sure you want to delete this listing?",
      [
        { text: t("common.cancel") || "Cancel", style: "cancel" },
        {
          text: t("common.delete") || "Delete",
          style: "destructive",
          onPress: async () => {
            const token = await getToken();
            const authSupabase = createClerkSupabaseClient(token);
            const { error } = await authSupabase
              .from("products")
              .delete()
              .eq("id", id);
            if (!error) fetchMyProducts();
          },
        },
      ],
    );
  };

  const renderActiveItem = (item: any) => (
    <View style={[styles.card, { backgroundColor: themeColors.card }]}>
      <View style={styles.cardContent}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/150",
          }}
          style={styles.image}
        />
        <View style={styles.details}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.price}>
            {formatPrice(item.price, item.metadata?.currency || "USD")}
          </ThemedText>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <EyeIcon size={14} color={themeColors.text} />
              <ThemedText style={styles.statText}>234</ThemedText>
            </View>
            <View style={styles.stat}>
              <ChatTeardropTextIcon size={14} color={themeColors.text} />
              <ThemedText style={styles.statText}>8</ThemedText>
            </View>
            <View style={styles.stat}>
              <ArrowsClockwiseIcon size={14} color={themeColors.text} />
              <ThemedText style={styles.statText}>0</ThemedText>
            </View>
            <ThemedText style={styles.timeAgo}>
              {formatTimeAgo(item.created_at, t)}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/sell/details?editId=${item.id}`)}
        >
          <PencilSimpleIcon size={18} color={themeColors.text} />
          <ThemedText style={styles.actionButtonText}>
            {t("listings_screen.edit")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <RocketLaunchIcon size={18} color={themeColors.text} />
          <ThemedText style={styles.actionButtonText}>
            {t("listings_screen.boost")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleUpdateStatus(item.id, "sold")}
        >
          <PauseIcon size={18} color={themeColors.text} />
          <ThemedText style={styles.actionButtonText}>
            {t("listings_screen.pause")}
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSoldItem = (item: any) => (
    <View style={[styles.card, { backgroundColor: themeColors.card }]}>
      <View style={styles.cardContent}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/150",
          }}
          style={styles.image}
        />
        <View style={styles.details}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {item.title}
          </ThemedText>
          <ThemedText style={styles.soldOn}>
            {t("listings_screen.pause_on")}{" "}
            {new Date(item.updated_at).toLocaleDateString()}
          </ThemedText>

          <View style={styles.soldPriceRow}>
            <ThemedText style={styles.price}>
              {formatPrice(item.price, item.metadata?.currency || "USD")}
            </ThemedText>
            <TouchableOpacity
              style={styles.relistBtn}
              onPress={() => handleUpdateStatus(item.id, "active")}
            >
              <ArrowsCounterClockwiseIcon size={16} color="#fff" />
              <ThemedText style={styles.relistText}>
                {t("listings_screen.relist")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderDraftItem = (item: any) => (
    <View style={[styles.card, { backgroundColor: themeColors.card }]}>
      <View style={styles.cardContent}>
        <Image
          source={{
            uri: item.images?.[0] || "https://via.placeholder.com/150",
          }}
          style={styles.image}
        />
        <View style={styles.details}>
          <ThemedText style={styles.title} numberOfLines={1}>
            {item.title || t("listings_screen.untitled_draft")}
          </ThemedText>

          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <ThemedText style={styles.progressLabel}>
                {t("listings_screen.completion")}
              </ThemedText>
              <ThemedText style={styles.progressPercent}>65%</ThemedText>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: "65%" }]} />
            </View>
          </View>

          <View style={styles.missingInfoRow}>
            <WarningCircleIcon size={14} color="#E44336" weight="fill" />
            <ThemedText style={styles.missingText}>
              {t("listings_screen.missing_info", {
                info: "Price, Description",
              })}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.draftActionBtn, { backgroundColor: "#3B82F6" }]}
          onPress={() => router.push(`/sell/details?editId=${item.id}`)}
        >
          <ThemedText style={styles.draftActionText}>
            {t("listings_screen.continue_editing")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.draftActionBtn, { backgroundColor: "#E5E7EB" }]}
          onPress={() => handleDelete(item.id)}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <TrashIcon size={16} color="#000" weight="fill" />
            <ThemedText style={[styles.draftActionText, { color: "#000" }]}>
              {t("common.delete")}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (status === "sold") return renderSoldItem(item);
    if (status === "draft") return renderDraftItem(item);
    return renderActiveItem(item);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {t(`user_actions.${status}`) || String(status).toUpperCase()}
        </ThemedText>
        <View style={{ width: 28 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#E44336" />
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText>
                {t("category.no_products") || "No listings found"}
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  backBtn: {
    padding: 4,
  },
  list: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    marginBottom: 16,
    padding: 12,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    gap: 12,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: "#f0f0f0",
  },
  details: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  soldOn: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    opacity: 0.6,
  },
  timeAgo: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: "auto",
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
  soldPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
  },
  relistBtn: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  relistText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    opacity: 0.6,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },
  missingInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  missingText: {
    fontSize: 11,
    color: "#E44336",
  },
  draftActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  draftActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 50,
  },
});
