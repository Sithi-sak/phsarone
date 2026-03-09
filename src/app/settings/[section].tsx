import { useAuth } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import { useTheme } from "@src/context/ThemeContext";
import useThemeColor from "@src/hooks/useThemeColor";
import Constants from "expo-constants";
import { Href, Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  CaretLeftIcon,
  CaretRightIcon,
  ShieldCheckIcon,
} from "phosphor-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SectionKey =
  | "about"
  | "account-security"
  | "addresses"
  | "billing"
  | "general"
  | "help-feedback"
  | "notifications"
  | "privacy";

const SECTION_TITLES: Record<SectionKey, string> = {
  about: "About PhsarOne",
  "account-security": "Account and Security",
  addresses: "Saved Meetup Addresses",
  billing: "Subscription and Billing",
  general: "General",
  "help-feedback": "Help and Feedback",
  notifications: "Notifications",
  privacy: "Privacy",
};

const STORAGE_KEYS = {
  allowMessagesFromEveryone: "settings:privacy:allowMessagesFromEveryone",
  dataSaver: "settings:general:dataSaver",
  marketing: "settings:notifications:marketing",
  offerUpdates: "settings:notifications:offerUpdates",
  productUpdates: "settings:notifications:productUpdates",
  readReceipts: "settings:privacy:readReceipts",
  showOnlineStatus: "settings:privacy:showOnlineStatus",
} as const;

interface ToggleRowProps {
  description?: string;
  label: string;
  onValueChange: (value: boolean) => void;
  value: boolean;
}

function ToggleRow({
  description,
  label,
  onValueChange,
  value,
}: ToggleRowProps) {
  const themeColors = useThemeColor();

  return (
    <View style={styles.rowWrap}>
      <View style={styles.rowTextWrap}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {description ? (
          <ThemedText style={styles.rowDescription}>{description}</ThemedText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D5DB", true: themeColors.primary + "80" }}
        thumbColor={value ? themeColors.primary : "#F9FAFB"}
      />
    </View>
  );
}

interface ActionRowProps {
  description?: string;
  label: string;
  onPress: () => void;
  valueText?: string;
}

function ActionRow({
  description,
  label,
  onPress,
  valueText,
}: ActionRowProps) {
  const themeColors = useThemeColor();
  return (
    <TouchableOpacity style={styles.rowWrap} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowTextWrap}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        {description ? (
          <ThemedText style={styles.rowDescription}>{description}</ThemedText>
        ) : null}
      </View>
      <View style={styles.rightWrap}>
        {valueText ? (
          <ThemedText style={styles.valueText}>{valueText}</ThemedText>
        ) : null}
        <CaretRightIcon size={18} color={themeColors.text} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsSectionScreen() {
  const themeColors = useThemeColor();
  const router = useRouter();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { i18n, t } = useTranslation();
  const { mode, setMode } = useTheme();
  const { signOut, userId } = useAuth();

  const sectionKey = (section || "") as SectionKey;
  const validSection = useMemo(
    () => Object.keys(SECTION_TITLES).includes(sectionKey),
    [sectionKey],
  );

  const [prefs, setPrefs] = useState({
    allowMessagesFromEveryone: true,
    dataSaver: false,
    marketing: false,
    offerUpdates: true,
    productUpdates: true,
    readReceipts: true,
    showOnlineStatus: true,
  });

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const entries = await AsyncStorage.multiGet(Object.values(STORAGE_KEYS));
        const values = Object.fromEntries(entries);

        setPrefs((prev) => ({
          ...prev,
          allowMessagesFromEveryone:
            values[STORAGE_KEYS.allowMessagesFromEveryone] === null
              ? prev.allowMessagesFromEveryone
              : values[STORAGE_KEYS.allowMessagesFromEveryone] === "true",
          dataSaver:
            values[STORAGE_KEYS.dataSaver] === null
              ? prev.dataSaver
              : values[STORAGE_KEYS.dataSaver] === "true",
          marketing:
            values[STORAGE_KEYS.marketing] === null
              ? prev.marketing
              : values[STORAGE_KEYS.marketing] === "true",
          offerUpdates:
            values[STORAGE_KEYS.offerUpdates] === null
              ? prev.offerUpdates
              : values[STORAGE_KEYS.offerUpdates] === "true",
          productUpdates:
            values[STORAGE_KEYS.productUpdates] === null
              ? prev.productUpdates
              : values[STORAGE_KEYS.productUpdates] === "true",
          readReceipts:
            values[STORAGE_KEYS.readReceipts] === null
              ? prev.readReceipts
              : values[STORAGE_KEYS.readReceipts] === "true",
          showOnlineStatus:
            values[STORAGE_KEYS.showOnlineStatus] === null
              ? prev.showOnlineStatus
              : values[STORAGE_KEYS.showOnlineStatus] === "true",
        }));
      } catch (error) {
        console.error("Failed to load settings preferences:", error);
      }
    };

    loadPrefs();
  }, []);

  const updatePref = async (key: keyof typeof STORAGE_KEYS, value: boolean) => {
    try {
      const storageKey = STORAGE_KEYS[key];
      await AsyncStorage.setItem(storageKey, String(value));
      setPrefs((prev) => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error("Failed to save setting preference:", error);
    }
  };

  const toggleLanguage = async () => {
    const nextLanguage = i18n.language === "kh" ? "en" : "kh";
    await i18n.changeLanguage(nextLanguage);
    await AsyncStorage.setItem("user-language", nextLanguage);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      Alert.alert(t("error"), t("settings_screen.sign_out_failed"));
    }
  };

  const comingSoon = (feature: string) => {
    Alert.alert("Coming soon", `${feature} will be available in a future update.`);
  };

  if (!validSection) {
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
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyWrap}>
          <ThemedText style={styles.emptyTitle}>This setting page was not found.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

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
        <ThemedText style={styles.headerTitle}>{SECTION_TITLES[sectionKey]}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sectionKey === "general" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <ActionRow
              label="Language"
              description="Choose Khmer or English for the app."
              valueText={i18n.language.toUpperCase()}
              onPress={toggleLanguage}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ToggleRow
              label="Dark mode"
              description="Use dark appearance across the app."
              value={mode === "dark"}
              onValueChange={(value) => setMode(value ? "dark" : "light")}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ToggleRow
              label="Data saver"
              description="Reduce auto-loading of media in chat and feeds."
              value={prefs.dataSaver}
              onValueChange={(value) => updatePref("dataSaver", value)}
            />
          </View>
        ) : null}

        {sectionKey === "notifications" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <ToggleRow
              label="New message alerts"
              description="Get notified when you receive chat messages."
              value={prefs.productUpdates}
              onValueChange={(value) => updatePref("productUpdates", value)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ToggleRow
              label="Trade offer updates"
              description="Receive updates for accepted or declined offers."
              value={prefs.offerUpdates}
              onValueChange={(value) => updatePref("offerUpdates", value)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ToggleRow
              label="Promotions"
              description="Allow occasional product and campaign announcements."
              value={prefs.marketing}
              onValueChange={(value) => updatePref("marketing", value)}
            />
          </View>
        ) : null}

        {sectionKey === "privacy" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <ToggleRow
              label="Show online status"
              description="Let others see when you are active in chat."
              value={prefs.showOnlineStatus}
              onValueChange={(value) => updatePref("showOnlineStatus", value)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ToggleRow
              label="Read receipts"
              description="Allow buyers and sellers to see when messages are read."
              value={prefs.readReceipts}
              onValueChange={(value) => updatePref("readReceipts", value)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ToggleRow
              label="Messages from everyone"
              description="Turn off to receive messages only from users you follow."
              value={prefs.allowMessagesFromEveryone}
              onValueChange={(value) => updatePref("allowMessagesFromEveryone", value)}
            />
          </View>
        ) : null}

        {sectionKey === "account-security" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <ActionRow
              label="Edit profile information"
              description="Update your name, phone, and bio."
              onPress={() => router.push("/user/edit" as Href)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="View public profile"
              description="See how others view your account."
              onPress={() =>
                userId ? router.push((`/user/${userId}` as Href)) : comingSoon("Public profile")
              }
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Change password"
              description="Protect your account with a new password."
              onPress={() => comingSoon("Password management")}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Two-factor authentication"
              description="Add an extra security layer for sign in."
              onPress={() => comingSoon("Two-factor authentication")}
            />
          </View>
        ) : null}

        {sectionKey === "addresses" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <ActionRow
              label="Default meetup area"
              description="Set your preferred trade handoff area."
              onPress={() => comingSoon("Meetup location management")}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Saved meetup addresses"
              description="Manage your frequently used meetup locations."
              onPress={() => comingSoon("Saved addresses")}
            />
          </View>
        ) : null}

        {sectionKey === "billing" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <ActionRow
              label="Manage subscription"
              description="Upgrade or change your current plan."
              onPress={() => router.push("/subscription" as Href)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Payment methods"
              description="Add or update card and billing details."
              onPress={() => comingSoon("Payment methods")}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Receipts and invoices"
              description="See billing history for your subscription."
              onPress={() => comingSoon("Invoices")}
            />
          </View>
        ) : null}

        {sectionKey === "help-feedback" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <ActionRow
              label="Help center"
              description="Browse support resources and open tickets."
              onPress={() => router.push("/user/support" as Href)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Submit feedback"
              description="Send product feedback or bug reports."
              onPress={() => router.push("/user/new_ticket" as Href)}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Safety tips"
              description="Best practices for secure buying and trading."
              onPress={() => comingSoon("Safety tips")}
            />
          </View>
        ) : null}

        {sectionKey === "about" ? (
          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <View style={styles.aboutTopRow}>
              <ShieldCheckIcon size={20} color={themeColors.primary} weight="fill" />
              <ThemedText style={styles.aboutTitle}>PhsarOne</ThemedText>
            </View>
            <ThemedText style={styles.aboutCopy}>
              PhsarOne connects buyers and sellers directly for local listings and trades.
            </ThemedText>

            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />

            <ActionRow
              label="App version"
              valueText={Constants.expoConfig?.version || "1.0.0"}
              onPress={() => {}}
            />
            <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
            <ActionRow
              label="Terms and policies"
              description="Review terms of service and privacy policy."
              onPress={() => comingSoon("Terms and policies")}
            />
          </View>
        ) : null}

        {sectionKey === "account-security" ? (
          <TouchableOpacity
            style={[styles.signOutBtn, { backgroundColor: themeColors.primary }]}
            onPress={handleSignOut}
            activeOpacity={0.75}
          >
            <ThemedText style={styles.signOutText}>Sign out</ThemedText>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    paddingVertical: 6,
  },
  rowWrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  rowTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDescription: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.62,
  },
  rightWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  valueText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
  },
  separator: {
    height: 1,
    marginHorizontal: 14,
  },
  aboutTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  aboutCopy: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.74,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  signOutBtn: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 52,
  },
  signOutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    opacity: 0.7,
    textAlign: "center",
  },
});



