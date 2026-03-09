import { useAuth } from "@clerk/clerk-expo";
import DashboardHeader from "@src/components/dashboard_components/DashboardHeader";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import {
  TradeInboxItem,
  TradeInboxStatus,
  useTradeInbox,
} from "@src/hooks/useTradeInbox";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Href, Stack, useRouter } from "expo-router";
import {
  ArrowsClockwiseIcon,
  ChatCircleIcon,
  CheckIcon,
  ClockIcon,
  XIcon,
} from "phosphor-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterKey = "received" | "sent" | "accepted" | "completed" | "declined";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "received", label: "Received" },
  { key: "sent", label: "Sent" },
  { key: "accepted", label: "Accepted" },
  { key: "completed", label: "Completed" },
  { key: "declined", label: "Declined" },
];

function matchesFilter(
  item: { direction: "received" | "sent"; status: TradeInboxStatus },
  filter: FilterKey,
) {
  if (filter === "received")
    return item.direction === "received" && item.status === "pending";
  if (filter === "sent")
    return item.direction === "sent" && item.status === "pending";
  return item.status === filter;
}

function statusPillColors(status: TradeInboxStatus) {
  if (status === "accepted") return { bg: "#DCFCE7", text: "#166534" };
  if (status === "completed") return { bg: "#DBEAFE", text: "#1D4ED8" };
  if (status === "declined") return { bg: "#FEE2E2", text: "#991B1B" };
  return { bg: "#FEF3C7", text: "#92400E" };
}

export default function MyTradesScreen() {
  const themeColors = useThemeColor();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const {
    items,
    loading,
    error,
    pendingCount,
    acceptedCount,
    updateOfferStatus,
  } = useTradeInbox();

  const [activeFilter, setActiveFilter] = useState<FilterKey>("received");
  const [updatingOfferId, setUpdatingOfferId] = useState<string | null>(null);
  const [openingChatOfferId, setOpeningChatOfferId] = useState<string | null>(
    null,
  );

  const filterCounts = useMemo(() => {
    return FILTERS.reduce(
      (acc, filter) => {
        acc[filter.key] = items.filter((item) =>
          matchesFilter(item, filter.key),
        ).length;
        return acc;
      },
      {} as Record<FilterKey, number>,
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => matchesFilter(item, activeFilter));
  }, [activeFilter, items]);

  const openTradeTab = () => {
    router.push("/(tabs)/chat?tab=trade" as Href);
  };

  const openTradeConversation = async (item: TradeInboxItem) => {
    if (!userId || !item.tradeId || !item.bidderId || !item.sellerId) {
      openTradeTab();
      return;
    }

    setOpeningChatOfferId(item.id);

    try {
      const token = await getToken({});
      if (!token) throw new Error("Could not get auth token.");

      const authSupabase = createClerkSupabaseClient(token);

      const { data: existingConversation, error: existingError } =
        await authSupabase
          .from("conversations")
          .select("id")
          .eq("trade_id", item.tradeId)
          .eq("seller_id", item.sellerId)
          .eq("buyer_id", item.bidderId)
          .maybeSingle();

      if (existingError && existingError.code !== "PGRST116") {
        throw existingError;
      }

      let conversationId = existingConversation?.id || "";

      if (!conversationId) {
        const { data: createdConversation, error: createError } =
          await authSupabase
            .from("conversations")
            .insert({
              buyer_id: item.bidderId,
              seller_id: item.sellerId,
              trade_id: item.tradeId,
            })
            .select("id")
            .single();

        if (createError) throw createError;
        conversationId = createdConversation.id;
      }

      const query = [
        `conversationId=${encodeURIComponent(conversationId)}`,
        `sellerId=${encodeURIComponent(item.sellerId)}`,
        `sellerName=${encodeURIComponent(item.ownerName)}`,
      ].join("&");

      router.push(
        `/chat/trade/${encodeURIComponent(item.tradeId)}?${query}` as Href,
      );
    } catch (openError) {
      console.error("Error opening trade conversation:", openError);
      Alert.alert("Chat unavailable", "Could not open this chat directly.");
      openTradeTab();
    } finally {
      setOpeningChatOfferId(null);
    }
  };

  const handleStatusUpdate = async (
    offerId: string,
    status: TradeInboxStatus,
  ) => {
    setUpdatingOfferId(offerId);
    const success = await updateOfferStatus(offerId, status);
    setUpdatingOfferId(null);

    if (!success) {
      Alert.alert("Error", "Failed to update trade offer status.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.background }]}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <DashboardHeader title="My Trades" />

      <View style={styles.content}>
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: themeColors.card,
            },
          ]}
        >
          <View style={styles.summaryTop}>
            <View style={styles.summaryTitleWrap}>
              <ArrowsClockwiseIcon size={16} color="#D9382C" weight="bold" />
              <ThemedText style={styles.summaryTitle}>Trade Inbox</ThemedText>
            </View>
            <ThemedText style={styles.summaryHint}>
              Manage offers by status
            </ThemedText>
          </View>

          <View style={styles.quickRow}>
            <View style={styles.quickItem}>
              <ClockIcon size={14} color="#000" weight="fill" />
              <ThemedText style={styles.quickLabel}>Pending</ThemedText>
              <ThemedText style={styles.quickValue}>{pendingCount}</ThemedText>
            </View>
            <View style={styles.quickItem}>
              <CheckIcon size={14} color="#000" weight="bold" />
              <ThemedText style={styles.quickLabel}>Accepted</ThemedText>
              <ThemedText style={styles.quickValue}>{acceptedCount}</ThemedText>
            </View>
            <View style={styles.quickItem}>
              <ChatCircleIcon size={14} color="#000" weight="fill" />
              <ThemedText style={styles.quickLabel}>Trade Chat</ThemedText>
              <TouchableOpacity onPress={openTradeTab} activeOpacity={0.8}>
                <ThemedText style={styles.quickLink}>Open</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
          showsHorizontalScrollIndicator={false}
        >
          {FILTERS.map((filter) => {
            const active = filter.key === activeFilter;
            return (
              <TouchableOpacity
                key={filter.key}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(filter.key)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? "#D9382C" : themeColors.card,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterText,
                    { color: active ? "#fff" : themeColors.text },
                  ]}
                >
                  {filter.label} ({filterCounts[filter.key] || 0})
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={themeColors.primary} />
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : null}

          {!loading && filteredItems.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: themeColors.card,
                },
              ]}
            >
              <ThemedText style={styles.emptyTitle}>
                No trade offers yet
              </ThemedText>
              <ThemedText style={styles.emptySubtitle}>
                Received and sent offers will appear here when users send
                offers.
              </ThemedText>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={openTradeTab}
                activeOpacity={0.85}
              >
                <ThemedText style={styles.emptyCtaText}>
                  Open Trade Chat
                </ThemedText>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading
            ? filteredItems.map((item) => {
                const colors = statusPillColors(item.status);
                const isReceivedPending =
                  item.direction === "received" && item.status === "pending";
                const isUpdating = updatingOfferId === item.id;
                const isOpeningChat = openingChatOfferId === item.id;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.offerCard,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.border,
                        opacity: isUpdating || isOpeningChat ? 0.7 : 1,
                      },
                    ]}
                  >
                    <View style={styles.offerTop}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: colors.bg },
                        ]}
                      >
                        <ThemedText
                          style={[styles.statusText, { color: colors.text }]}
                        >
                          {item.status[0].toUpperCase() + item.status.slice(1)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.offerTime}>
                        {item.updatedAt}
                      </ThemedText>
                    </View>

                    <ThemedText style={styles.offerOwner}>
                      {item.ownerLabel}: {item.ownerName}
                    </ThemedText>
                    <ThemedText style={styles.offerItems}>
                      Their item: {item.otherItem}
                    </ThemedText>
                    <ThemedText style={styles.offerItems}>
                      Your item: {item.yourItem}
                    </ThemedText>

                    <View style={styles.actionRow}>
                      {isReceivedPending ? (
                        <>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionSuccess]}
                            activeOpacity={0.8}
                            disabled={isUpdating}
                            onPress={() =>
                              handleStatusUpdate(item.id, "accepted")
                            }
                          >
                            <CheckIcon size={14} color="#fff" weight="bold" />
                            <ThemedText style={styles.actionPrimaryText}>
                              Accept
                            </ThemedText>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, styles.actionDanger]}
                            activeOpacity={0.8}
                            disabled={isUpdating}
                            onPress={() =>
                              handleStatusUpdate(item.id, "declined")
                            }
                          >
                            <XIcon size={14} color="#fff" weight="bold" />
                            <ThemedText style={styles.actionPrimaryText}>
                              Decline
                            </ThemedText>
                          </TouchableOpacity>
                        </>
                      ) : null}

                      <TouchableOpacity
                        style={[
                          styles.actionBtn,
                          isReceivedPending
                            ? styles.actionGhost
                            : styles.actionPrimary,
                        ]}
                        onPress={() => openTradeConversation(item)}
                        activeOpacity={0.8}
                        disabled={isOpeningChat}
                      >
                        {isReceivedPending ? (
                          <ThemedText style={styles.actionGhostText}>
                            Counter in Chat
                          </ThemedText>
                        ) : (
                          <>
                            <ChatCircleIcon
                              size={14}
                              color="#fff"
                              weight="fill"
                            />
                            <ThemedText style={styles.actionPrimaryText}>
                              Open Chat
                            </ThemedText>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  summaryCard: {
    borderRadius: 20,
    borderCurve: "continuous",
    marginBottom: 12,
    padding: 12,
  },
  summaryTop: {
    marginBottom: 10,
  },
  summaryTitleWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryHint: {
    fontSize: 13,
    opacity: 0.65,
  },
  quickRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickItem: {
    alignItems: "center",
    flex: 1,
  },
  quickLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  quickValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 2,
  },
  quickLink: {
    color: "#D9382C",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  filterScroll: {
    flexGrow: 0,
    maxHeight: 48,
  },
  filterRow: {
    alignItems: "center",
    columnGap: 8,
    paddingBottom: 6,
    paddingRight: 10,
  },
  filterChip: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  list: {
    flex: 1,
    marginTop: 8,
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: 20,
    borderCurve: "continuous",
    paddingHorizontal: 14,
    paddingVertical: 22,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.65,
    textAlign: "center",
  },
  emptyCta: {
    backgroundColor: "#D9382C",
    borderRadius: 99,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyCtaText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  offerCard: {
    borderRadius: 20,
    borderCurve: "continuous",
    padding: 12,
  },
  offerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  offerTime: {
    fontSize: 12,
    opacity: 0.55,
  },
  offerOwner: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  offerItems: {
    fontSize: 13,
    opacity: 0.78,
  },
  actionRow: {
    columnGap: 8,
    flexDirection: "row",
    marginTop: 10,
  },
  actionBtn: {
    alignItems: "center",
    borderRadius: 99,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  actionPrimary: {
    backgroundColor: "#D9382C",
    columnGap: 4,
  },
  actionSuccess: {
    backgroundColor: "#16A34A",
    columnGap: 4,
  },
  actionDanger: {
    backgroundColor: "#DC2626",
    columnGap: 4,
  },
  actionGhost: {
    backgroundColor: "#F3F4F6",
  },
  actionPrimaryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  actionGhostText: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
  },
});
