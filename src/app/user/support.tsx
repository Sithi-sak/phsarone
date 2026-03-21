import { useAuth } from "@clerk/clerk-expo";
import { useIsFocused } from "@react-navigation/native";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Href, Stack, useRouter } from "expo-router";
import { CaretLeftIcon, WarningDiamondIcon } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SUPPORT_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
};

export default function SupportScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const isFocused = useIsFocused();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchTickets = async (showLoading = true) => {
    if (isFetchingRef.current) {
      setRefreshing(false);
      return;
    }
    if (!userId) {
      setTickets([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      if (showLoading) setLoading(true);
      setError(null);
      const token = await getAuthToken(
        getToken,
        "support tickets fetch",
        SUPPORT_AUTH_OPTIONS,
      );
      const authSupabase = createClerkSupabaseClient(token);
      const { data, error: fetchError } = await authSupabase
        .from("support_tickets")
        .select("id, subject, description, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setTickets((data as SupportTicket[]) || []);
    } catch (err: any) {
      console.warn("Support ticket fetch warning:", err);
      setError(err?.message || "Could not load tickets.");
    } finally {
      isFetchingRef.current = false;
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchTickets(true);
    }
  }, [isFocused, userId]);

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "resolved":
        return { bg: "#E7F6EC", text: "#0F9D58", label: t("support_screen.status_resolved") };
      case "in_progress":
        return { bg: "#FFF4E5", text: "#B54708", label: t("support_screen.status_in_progress") };
      case "closed":
        return { bg: "#EEF2F6", text: "#475467", label: t("support_screen.status_closed") };
      default:
        return { bg: "#FDECEC", text: "#D9382C", label: t("support_screen.status_open") };
    }
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
          {t("support_screen.help_center")}
        </ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <View
        style={[styles.content, { backgroundColor: themeColors.background }]}
      >
        <View style={styles.subHeader}>
          <ThemedText style={styles.sectionTitle}>
            {t("support_screen.opened_tickets")}
          </ThemedText>
          <TouchableOpacity
            style={[
              styles.newTicketBtn,
              { backgroundColor: themeColors.primary },
            ]}
            onPress={() => router.push("/user/new_ticket" as Href)}
          >
            <ThemedText
              style={[
                styles.newTicketText,
                { color: themeColors.primaryButtonText },
              ]}
            >
              {t("support_screen.new_ticket")}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={themeColors.primary} />
          </View>
        ) : tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <WarningDiamondIcon size={60} color="#FFB800" weight="thin" />
            <ThemedText style={styles.emptyTitle}>
              {t("support_screen.no_tickets")}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.ticketList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchTickets(false);
                }}
                tintColor={themeColors.primary}
              />
            }
            renderItem={({ item }) => {
              const status = getStatusStyle(item.status);
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push(`/user/ticket/${item.id}` as Href)
                  }
                  style={[
                    styles.ticketCard,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <View style={styles.ticketRow}>
                    <ThemedText style={styles.ticketSubject} numberOfLines={1}>
                      {item.subject}
                    </ThemedText>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: status.bg },
                      ]}
                    >
                      <ThemedText
                        style={[styles.statusText, { color: status.text }]}
                      >
                        {status.label}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText
                    style={[styles.ticketDate, { color: themeColors.text + "88" }]}
                  >
                    {formatDate(item.created_at)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.ticketDescription,
                      { color: themeColors.text + "AA" },
                    ]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </ThemedText>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </View>

      <ActionStatusModal
        visible={!!error}
        tone="error"
        title={t("support_screen.error_load_title")}
        description={error || t("support_screen.error_try_again")}
        actionLabel={t("common.dismiss")}
        onClose={() => setError(null)}
      />
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
  loadingWrap: {
    alignItems: "center",
    flex: 0.6,
    justifyContent: "center",
  },
  subHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  newTicketBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
  },
  newTicketText: {
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    flex: 0.6,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    opacity: 0.8,
  },
  ticketList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  ticketCard: {
    borderRadius: 10,
    padding: 14,
  },
  ticketRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  ticketSubject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    marginRight: 10,
  },
  ticketDate: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  ticketDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
