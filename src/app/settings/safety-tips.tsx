import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { Stack, useRouter } from "expo-router";
import { CaretLeftIcon, ShieldCheckIcon } from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SafetyTipsScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const tips = [1, 2, 3, 4, 5, 6].map((index) => ({
    title: t(`safety_tips.tip${index}_title`),
    body: t(`safety_tips.tip${index}_body`),
  }));

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
        <ThemedText style={styles.headerTitle}>{t("safety_tips.title")}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroIconWrap}>
              <ShieldCheckIcon size={20} color={themeColors.primary} weight="fill" />
            </View>
            <ThemedText style={styles.heroTitle}>{t("safety_tips.hero_title")}</ThemedText>
          </View>
          <ThemedText
            style={[styles.heroCopy, { color: themeColors.text + "B3" }]}
          >
            {t("safety_tips.hero_copy")}
          </ThemedText>
        </View>

        {tips.map((tip) => (
          <View
            key={tip.title}
            style={[
              styles.tipCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
              },
            ]}
          >
            <ThemedText style={styles.tipTitle}>{tip.title}</ThemedText>
            <ThemedText style={[styles.tipBody, { color: themeColors.text + "AA" }]}>
              {tip.body}
            </ThemedText>
          </View>
        ))}
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
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 8,
  },
  heroCard: {
    borderRadius: 10,
    padding: 18,
  },
  heroRow: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 10,
  },
  heroIconWrap: {
    alignItems: "center",
    backgroundColor: "#FDECEC",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    marginRight: 10,
    width: 36,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  heroCopy: {
    fontSize: 14,
    lineHeight: 21,
  },
  tipCard: {
    borderRadius: 10,
    padding: 16,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  tipBody: {
    fontSize: 14,
    lineHeight: 21,
  },
});
