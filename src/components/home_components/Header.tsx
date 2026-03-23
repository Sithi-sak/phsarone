import useThemeColor from "@src/hooks/useThemeColor";
import { useUnreadNotificationsCount } from "@src/hooks/useUnreadNotificationsCount";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, TouchableOpacity, View } from "react-native";
import DynamicPhosphorIcon from "../shared_components/DynamicPhosphorIcon";
import { useRouter, Href } from "expo-router";
import { ThemedText } from "../shared_components/ThemedText";

export default function Header() {
  const themeColors = useThemeColor();
  const router = useRouter();
  const { count } = useUnreadNotificationsCount();
  useTranslation();

  return (
    <View
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <View style={styles.logoContainer}>
        <Image
          source={require("@src/assets/icons/Wordmark.png")}
          style={styles.logoIcon}
          resizeMode="contain"
        />
      </View>
      <View style={styles.iconsRight}>
        <TouchableOpacity
          onPress={() => router.push("/notifications" as Href)}
          style={styles.notificationButton}
        >
          {/* Notification */}
          <DynamicPhosphorIcon name="Bell" size={24} color={themeColors.text} />
          {count > 0 ? (
            <View style={[styles.notificationBadge, { backgroundColor: themeColors.tint }]}>
              <ThemedText style={styles.notificationBadgeText}>
                {count > 9 ? "9+" : String(count)}
              </ThemedText>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
  },
  logoIcon: {
    width: undefined,
    height: "100%",
    aspectRatio: 4,
  },
  iconsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  notificationButton: {
    position: "relative",
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  languageIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  languageTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
