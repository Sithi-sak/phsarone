import { useAuth } from "@clerk/clerk-expo";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { Href, Stack, useRouter } from "expo-router";
import {
  BellIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CreditCardIcon,
  GearSixIcon,
  HeadphonesIcon,
  InfoIcon,
  LockIcon,
  UserCircleIcon,
} from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingItemProps {
  icon: React.ElementType;
  label: string;
  onPress: () => void;
  showSeparator?: boolean;
}

const SettingItem = ({
  icon: Icon,
  label,
  onPress,
  showSeparator = true,
}: SettingItemProps) => {
  const themeColors = useThemeColor();
  return (
    <View>
      <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.itemLeft}>
          <Icon size={24} color={themeColors.text} weight="regular" />
          <ThemedText style={styles.itemLabel}>{label}</ThemedText>
        </View>
        <CaretRightIcon size={20} color={themeColors.text} />
      </TouchableOpacity>
      {showSeparator ? (
        <View
          style={[
            styles.separator,
            { backgroundColor: themeColors.text + "10" },
          ]}
        />
      ) : null}
    </View>
  );
};

export default function SettingsScreen() {
  const themeColors = useThemeColor();
  const { signOut } = useAuth();
  const router = useRouter();
  const { t } = useTranslation();

  const goTo = (path: string) => () => router.push(path as Href);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/sign-in");
    } catch (error: any) {
      console.error("Sign out error:", error);
      alert(t("settings_screen.sign_out_failed"));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView edges={["top"]} style={{ backgroundColor: themeColors.background }}>
        <View style={[styles.header, { backgroundColor: themeColors.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>{t("settings_screen.settings")}</ThemedText>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <SettingItem
            icon={UserCircleIcon}
            label={t("settings_screen.account_security")}
            onPress={goTo("/settings/account-security")}
          />
          <SettingItem
            icon={CreditCardIcon}
            label={t("settings_screen.payment_settings")}
            onPress={goTo("/settings/payment-settings")}
            showSeparator={false}
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <SettingItem
            icon={GearSixIcon}
            label={t("settings_screen.general")}
            onPress={goTo("/settings/general")}
          />
          <SettingItem
            icon={BellIcon}
            label={t("settings_screen.notifications")}
            onPress={goTo("/settings/notifications")}
          />
          <SettingItem
            icon={LockIcon}
            label={t("settings_screen.privacy")}
            onPress={goTo("/settings/privacy")}
            showSeparator={false}
          />
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <SettingItem
            icon={HeadphonesIcon}
            label={t("settings_screen.help_feedback")}
            onPress={goTo("/settings/help-feedback")}
          />
          <SettingItem
            icon={InfoIcon}
            label={t("settings_screen.about_phsarone")}
            onPress={goTo("/settings/about")}
            showSeparator={false}
          />
        </View>

        <TouchableOpacity
          onPress={handleSignOut}
          style={[
            styles.signOutButton,
            { backgroundColor: themeColors.primary },
          ]}
          activeOpacity={0.7}
        >
          <ThemedText style={[styles.signOutText, { color: themeColors.background }]}>
            {t("settings_screen.sign_out")}
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    gap: 16,
    padding: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  backButton: {
    padding: 8,
  },
  card: {
    borderCurve: "continuous",
    borderRadius: 12,
    overflow: "hidden",
  },
  item: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    paddingVertical: 18,
  },
  itemLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
    marginLeft: 52,
  },
  signOutButton: {
    alignItems: "center",
    borderRadius: 99,
    justifyContent: "center",
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 14,
  },
});

