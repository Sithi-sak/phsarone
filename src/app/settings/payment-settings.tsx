import { Stack, useRouter } from "expo-router";
import { CaretLeftIcon, CreditCardIcon, ReceiptIcon } from "phosphor-react-native";
import React from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@src/components/shared_components/ThemedText";
import useThemeColor from "@src/hooks/useThemeColor";
import { useCurrentSubscription } from "@src/hooks/useCurrentSubscription";
import { useTranslation } from "react-i18next";

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

export default function PaymentSettingsScreen() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { subscription, loading } = useCurrentSubscription();

  const paymentProvider = String(subscription?.payment_provider || "stripe").toUpperCase();
  const billingState = subscription
    ? t("payment_settings.billing_status_connected")
    : t("payment_settings.billing_status_empty");

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
        <ThemedText style={styles.headerTitle}>{t("payment_settings.title")}</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={themeColors.primary} />
              <ThemedText style={styles.loadingText}>{t("payment_settings.loading")}</ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.infoHeader}>
                <View style={[styles.iconWrap, { backgroundColor: "#FEECE9" }]}>
                  <CreditCardIcon size={18} color={themeColors.primary} weight="fill" />
                </View>
                <View style={styles.infoTextWrap}>
                  <ThemedText style={styles.infoTitle}>{t("payment_settings.management_title")}</ThemedText>
                  <ThemedText style={[styles.infoCopy, { color: themeColors.text + "88" }]}>
                    {t("payment_settings.management_copy")}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row label={t("payment_settings.provider")} value={paymentProvider} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row label={t("payment_settings.billing_status")} value={billingState} />
              <View style={[styles.separator, { backgroundColor: themeColors.text + "10" }]} />
              <Row
                label={t("payment_settings.payment_method")}
                value={subscription ? t("payment_settings.payment_method_later") : "-"}
              />
            </>
          )}
        </View>

        <View style={[styles.secondaryCard, { backgroundColor: themeColors.card }]}>
          <View style={styles.secondaryRow}>
            <ReceiptIcon size={18} color={themeColors.text} />
            <View style={styles.secondaryTextWrap}>
              <ThemedText style={styles.secondaryTitle}>{t("payment_settings.invoices_title")}</ThemedText>
              <ThemedText style={[styles.secondaryCopy, { color: themeColors.text + "88" }]}>
                {t("payment_settings.invoices_copy")}
              </ThemedText>
            </View>
          </View>
        </View>
      </View>
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
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    padding: 16,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 28,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.6,
  },
  infoHeader: {
    flexDirection: "row",
    gap: 12,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  infoTextWrap: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  infoCopy: {
    fontSize: 14,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    marginVertical: 16,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.7,
    textAlign: "right",
  },
  secondaryCard: {
    borderRadius: 16,
    padding: 16,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryTextWrap: {
    flex: 1,
  },
  secondaryTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  secondaryCopy: {
    fontSize: 13,
    lineHeight: 19,
  },
});
