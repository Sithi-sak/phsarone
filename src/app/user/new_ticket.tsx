import { useAuth } from "@clerk/clerk-expo";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ThemedTextInput } from "@src/components/shared_components/ThemedTextInput";
import useThemeColor from "@src/hooks/useThemeColor";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { Stack, useRouter } from "expo-router";
import { CaretLeftIcon, PlusCircleIcon } from "phosphor-react-native";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NewTicketScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSend = async () => {
    if (!userId) {
      Alert.alert(
        t("support_screen.sign_in_required"),
        t("support_screen.sign_in_required_desc"),
      );
      return;
    }

    if (!subject.trim()) {
      Alert.alert(
        t("support_screen.subject_required"),
        t("support_screen.subject_required_desc"),
      );
      return;
    }

    if (!description.trim()) {
      Alert.alert(
        t("support_screen.description_required"),
        t("support_screen.description_required_desc"),
      );
      return;
    }

    try {
      setSubmitting(true);
      const token = await getAuthToken(getToken, "support ticket create", {
        timeoutMs: 45000,
        retries: 2,
      });
      const authSupabase = createClerkSupabaseClient(token);
      const { error } = await authSupabase.from("support_tickets").insert({
        user_id: userId,
        subject: subject.trim(),
        description: description.trim(),
        status: "open",
      });

      if (error) throw error;

      setShowSuccessModal(true);
    } catch (err: any) {
      console.warn("Support ticket create warning:", err);
      Alert.alert(
        t("support_screen.error_send_title"),
        err?.message || t("support_screen.error_try_again"),
      );
    } finally {
      setSubmitting(false);
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
        <ThemedText style={styles.headerTitle}>{t("support_screen.new_ticket")}</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t("support_screen.subject")}</ThemedText>
            <ThemedTextInput
              style={[
                styles.input,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  borderWidth: 1,
                },
              ]}
              value={subject}
              onChangeText={setSubject}
              placeholder=""
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>{t("support_screen.description")}</ThemedText>
            <ThemedTextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                  borderWidth: 1,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              placeholder=""
            />
          </View>

          <TouchableOpacity
            style={[
              styles.filePicker,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                borderWidth: 1,
                borderStyle: "dashed",
              },
            ]}
            onPress={() =>
              Alert.alert(
                t("support_screen.attachments_coming_soon"),
                t("support_screen.attachments_coming_soon_desc"),
              )
            }
          >
            <PlusCircleIcon
              size={24}
              color={themeColors.text}
              weight="regular"
            />
            <ThemedText style={styles.filePickerText}>
              {t("support_screen.choose_files")}
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor: submitting
                  ? themeColors.primary + "99"
                  : themeColors.primary,
              },
            ]}
            onPress={handleSend}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator
                size="small"
                color={themeColors.primaryButtonText}
              />
            ) : (
              <ThemedText
                style={[
                  styles.sendBtnText,
                  { color: themeColors.primaryButtonText },
                ]}
              >
                {t("support_screen.send")}
              </ThemedText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <ActionStatusModal
        visible={showSuccessModal}
        tone="success"
        hideHeaderTone
        title={t("support_screen.ticket_created")}
        description={t("support_screen.ticket_created_desc")}
        actionLabel={t("common.continue")}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace("/user/support");
        }}
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
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    borderWidth: 0,
  },
  textArea: {
    height: 150,
    textAlignVertical: "top",
    paddingTop: 16,
  },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 10,
    borderCurve: "continuous",
    gap: 12,
  },
  filePickerText: {
    fontSize: 16,
    fontWeight: "500",
  },
  sendBtn: {
    paddingVertical: 12,
    borderRadius: 99,
    alignItems: "center",
  },
  sendBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
