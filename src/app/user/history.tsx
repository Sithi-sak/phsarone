import { useAuth } from "@clerk/clerk-expo";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { getOptimizedStorageImageUrl } from "@src/utils/storageImage";
import { Href, Stack, useFocusEffect, useRouter } from "expo-router";
import { CaretLeftIcon, ClockCounterClockwiseIcon } from "phosphor-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HistoryItem = {
  id: string;
  images?: string[];
  location_name?: string | null;
  metadata?: { currency?: string } | null;
  price?: number | string | null;
  title?: string | null;
  viewed_at: string;
};

type HistoryRow =
  | { id: string; title: string; type: "header" }
  | { id: string; items: HistoryItem[]; type: "cards" };

const HISTORY_AUTH_OPTIONS = {
  retries: 1,
  timeoutMs: 30000,
} as const;

function getHistoryBucketLabel(value: string) {
  const viewed = new Date(value);
  const now = new Date();

  const viewedDay = new Date(
    viewed.getFullYear(),
    viewed.getMonth(),
    viewed.getDate(),
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (today.getTime() - viewedDay.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 6) return "Earlier this week";

  return viewed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default function HistoryScreen() {
  const { userId, getToken } = useAuth();
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearError, setShowClearError] = useState(false);

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
      const token = await getAuthToken(
        getToken,
        "history fetch",
        HISTORY_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);

      const { data, error } = await authSupabase
        .from("view_history")
        .select(
          `
          viewed_at,
          product:products (
            id,
            title,
            price,
            images,
            location_name,
            metadata
          )
        `,
        )
        .eq("user_id", userId as string)
        .not("product_id", "is", null)
        .order("viewed_at", { ascending: false });

      if (error) throw error;

      const extractedHistory = data
        ?.map((item: any) =>
          item.product
            ? {
                ...item.product,
                viewed_at: item.viewed_at,
              }
            : null,
        )
        .filter(Boolean);

      setHistory((extractedHistory as HistoryItem[]) || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    setShowClearConfirm(true);
  };

  const confirmClearHistory = async () => {
    try {
      const token = await getAuthToken(
        getToken,
        "history clear item",
        HISTORY_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase
        .from("view_history")
        .delete()
        .eq("user_id", userId as string);

      if (error) throw error;
      setHistory([]);
    } catch {
      setShowClearError(true);
    } finally {
      setShowClearConfirm(false);
    }
  };

  const rows = useMemo<HistoryRow[]>(() => {
    const groups = new Map<string, HistoryItem[]>();

    for (const item of history) {
      const label = getHistoryBucketLabel(item.viewed_at);
      const existing = groups.get(label) || [];
      existing.push(item);
      groups.set(label, existing);
    }

    const nextRows: HistoryRow[] = [];

    for (const [title, items] of groups.entries()) {
      nextRows.push({
        id: `header-${title}`,
        title,
        type: "header",
      });

      for (let index = 0; index < items.length; index += 2) {
        nextRows.push({
          id: `cards-${title}-${index}`,
          items: items.slice(index, index + 2),
          type: "cards",
        });
      }
    }

    return nextRows;
  }, [history]);

  const renderProductCard = (item: HistoryItem, isPlaceholder = false) => {
    if (isPlaceholder) {
      return <View style={styles.placeholderCard} />;
    }

    const imageUrl = getOptimizedStorageImageUrl(
      item.images?.[0] || "https://via.placeholder.com/300",
      "thumb",
    );

    return (
      <TouchableOpacity
        style={[styles.productCard, { backgroundColor: themeColors.card }]}
        onPress={() => router.push(`/product/${item.id}` as Href)}
        activeOpacity={0.82}
      >
        <Image source={{ uri: imageUrl }} style={styles.productImage} />
        <View style={styles.productBody}>
          <ThemedText style={styles.productTitle} numberOfLines={2}>
            {item.title || "Listing"}
          </ThemedText>
          <ThemedText style={styles.productMeta} numberOfLines={1}>
            {(item.location_name || "Marketplace").trim()} •{" "}
            {formatShortDate(item.viewed_at)}
          </ThemedText>
          <ThemedText
            style={[styles.productPrice, { color: themeColors.primary }]}
          >
            {item.metadata?.currency === "KHR" ? "៛" : "$"}
            {item.price}
          </ThemedText>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRow = ({ item }: { item: HistoryRow }) => {
    if (item.type === "header") {
      return (
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>{item.title}</ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.cardsRow}>
        {renderProductCard(item.items[0])}
        {item.items[1]
          ? renderProductCard(item.items[1])
          : renderProductCard(
              {
                id: "placeholder",
                viewed_at: "",
              },
              true,
            )}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: themeColors.background }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <Modal
        visible={showClearConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearConfirm(false)}
      >
        <Pressable
          style={styles.confirmBackdrop}
          onPress={() => setShowClearConfirm(false)}
        >
          <Pressable
            style={[
              styles.confirmCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
            onPress={(event) => event.stopPropagation()}
          >
            <ThemedText style={[styles.confirmTitle, { color: themeColors.text }]}>
              Clear history
            </ThemedText>
            <ThemedText
              style={[
                styles.confirmDescription,
                { color: themeColors.text + "B3" },
              ]}
            >
              This will remove your recently viewed listings from this account
              view.
            </ThemedText>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[
                  styles.confirmSecondaryButton,
                  { borderColor: themeColors.border },
                ]}
                onPress={() => setShowClearConfirm(false)}
                activeOpacity={0.85}
              >
                <ThemedText
                  style={[
                    styles.confirmSecondaryText,
                    { color: themeColors.text },
                  ]}
                >
                  Not now
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmPrimaryButton,
                  { backgroundColor: themeColors.primary },
                ]}
                onPress={confirmClearHistory}
                activeOpacity={0.85}
              >
                <ThemedText style={styles.confirmPrimaryText}>
                  Clear all
                </ThemedText>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <ActionStatusModal
        visible={showClearError}
        title="Couldn’t clear history"
        description="Please try again in a moment."
        actionLabel="Close"
        tone="error"
        onClose={() => setShowClearError(false)}
      />

      <View
        style={[styles.header, { backgroundColor: themeColors.background }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <CaretLeftIcon size={28} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>
          {t("user_actions.history")}
        </ThemedText>
        <TouchableOpacity
          onPress={handleClearHistory}
          disabled={!history.length}
          style={styles.clearBtn}
        >
          <ThemedText
            style={[
              styles.clearBtnText,
              {
                color: history.length
                  ? themeColors.primary
                  : themeColors.text + "35",
              },
            ]}
          >
            {t("user_actions.clear_all")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={themeColors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            history.length ? (
              <View style={styles.heroBlock}>
                <ThemedText style={styles.heroTitle}>Recently viewed</ThemedText>
              </View>
            ) : null
          }
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
              <ThemedText style={styles.emptySubtitle}>
                Products you open will appear here for quick access later.
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    padding: 8,
  },
  cardsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
  },
  confirmBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.46)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  confirmCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    width: "100%",
  },
  confirmDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 18,
  },
  confirmPrimaryButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    paddingVertical: 13,
  },
  confirmPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmSecondaryButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 13,
  },
  confirmSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  clearBtn: {
    minWidth: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 120,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    opacity: 0.36,
    textAlign: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    opacity: 0.35,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  heroBlock: {
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.58,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  list: {
    paddingBottom: 40,
  },
  placeholderCard: {
    flex: 1,
  },
  productBody: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  productCard: {
    borderCurve: "continuous",
    borderRadius: 6,
    elevation: 1,
    flex: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  productImage: {
    backgroundColor: "#F3F4F6",
    height: 118,
    width: "100%",
  },
  productMeta: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
    opacity: 0.46,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    minHeight: 38,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
});
