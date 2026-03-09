import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { ListBullets } from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";

interface FormattingFeatureBannerProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export default function FormattingFeatureBanner({
  isEnabled,
}: FormattingFeatureBannerProps) {
  const themeColors = useThemeColor();
  const { t } = useTranslation();

  if (!isEnabled) {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: themeColors.primary + "15",
          borderColor: themeColors.primary,
        },
      ]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <ListBullets size={18} color={themeColors.primary} weight="bold" />
        </View>
        <View style={styles.textContainer}>
          <ThemedText style={[styles.title, { color: themeColors.primary }]}>
            {t("productDetailsComponents.autoFormatDetails", {
              defaultValue: "Auto-Format Details",
            })}
          </ThemedText>
          <ThemedText
            style={[styles.description, { color: themeColors.tabIconDefault }]}
          >
            {t("productDetailsComponents.formattingDescription", {
              defaultValue: "Your details are being formatted and validated",
            })}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 8,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
});
