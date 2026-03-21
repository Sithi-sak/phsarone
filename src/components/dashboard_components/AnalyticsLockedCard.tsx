import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { Href, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type AnalyticsLockedCardProps = {
  ctaLabel?: string;
  description: string;
  requiredPlan: "starter" | "business";
  title: string;
};

export default function AnalyticsLockedCard({
  ctaLabel = "View plans",
  description,
  requiredPlan,
  title,
}: AnalyticsLockedCardProps) {
  const router = useRouter();
  const themeColors = useThemeColor();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
        },
      ]}
    >
      <ThemedText style={[styles.title, { color: themeColors.text }]}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.description, { color: themeColors.text + "B3" }]}>
        {description}
      </ThemedText>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: themeColors.tint }]}
        onPress={() =>
          router.push({
            pathname: "/subscription" as Href,
            params: { plan: requiredPlan },
          })
        }
        activeOpacity={0.85}
      >
        <ThemedText
          style={[styles.buttonText, { color: themeColors.primaryButtonText }]}
        >
          {ctaLabel}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  button: {
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 12,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
