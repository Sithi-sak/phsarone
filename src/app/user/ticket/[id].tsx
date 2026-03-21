import { useAuth } from "@clerk/clerk-expo";
import { useIsFocused } from "@react-navigation/native";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
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
  updated_at: string;
};

export default function SupportTicketDetailScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, getToken } = useAuth();
  const isFocused = useIsFocused();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const fetchTicket = async () => {
      if (isFetchingRef.current) return;
      if (!userId || !id) {
        setLoading(false);
        return;
      }

      try {
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);
        const token = await getAuthToken(
          getToken,
          "support ticket detail fetch",
          SUPPORT_AUTH_OPTIONS,
        );
        const authSupabase = createClerkSupabaseClient(token);
        const { data, error: fetchError } = await authSupabase
          .from("support_tickets")
          .select("id, subject, description, status, created_at, updated_at")
          .eq("id", id)
          .eq("user_id", userId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        setTicket((data as SupportTicket | null) || null);
      } catch (err: any) {
        console.warn("Support ticket detail warning:", err);
        setError(err?.message || t("support_screen.ticket_error_load"));
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
      }
    };

    if (isFocused) {
      fetchTicket();
    }
  }, [id, isFocused, userId]);

  const formatDate = (value?: string) =>
    value
      ? new Date(value).toLocaleString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

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

      <View style={[styles.header, { backgroundColor: themeColors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{t("support_screen.ticket_details")}</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : ticket ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <View style={styles.topRow}>
              <ThemedText style={styles.subject}>{ticket.subject}</ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusStyle(ticket.status).bg },
                ]}
              >
                <ThemedText
                  style={[
                    styles.statusText,
                    { color: getStatusStyle(ticket.status).text },
                  ]}
                >
                  {getStatusStyle(ticket.status).label}
                </ThemedText>
              </View>
            </View>

            <ThemedText
              style={[styles.metaText, { color: themeColors.text + "88" }]}
            >
              {t("support_screen.created")} {formatDate(ticket.created_at)}
            </ThemedText>
            <ThemedText
              style={[styles.metaText, { color: themeColors.text + "88" }]}
            >
              {t("support_screen.updated")} {formatDate(ticket.updated_at)}
            </ThemedText>

            <View
              style={[
                styles.descriptionBox,
                { backgroundColor: themeColors.background },
              ]}
            >
              <ThemedText style={styles.descriptionTitle}>
                {t("support_screen.description")}
              </ThemedText>
              <ThemedText style={styles.descriptionText}>
                {ticket.description}
              </ThemedText>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.center}>
          <ThemedText>{t("support_screen.ticket_not_found")}</ThemedText>
        </View>
      )}

      <ActionStatusModal
        visible={!!error}
        tone="error"
        title={t("support_screen.ticket_error_title")}
        description={error || t("support_screen.error_try_again")}
        actionLabel={t("common.dismiss")}
        onClose={() => setError(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  center: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 10,
    padding: 16,
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  subject: {
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
    marginRight: 12,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  descriptionBox: {
    borderRadius: 16,
    marginTop: 16,
    padding: 14,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
  },
});
