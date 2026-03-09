import { useAuth } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import PricingCard, {
  PricingPlan,
} from "@src/components/subscription/PricingCard";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CreateIntentResponse = {
  clientSecret: string;
  paymentIntentId: string;
  planId: string;
};

type ConfirmPaymentResponse = {
  success: boolean;
};

const VALID_PLAN_IDS = new Set(["starter", "pro", "business"]);

export default function SubscriptionPage() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { plan } = useLocalSearchParams<{ plan?: string | string[] }>();

  const [selectedPlanId, setSelectedPlanId] = useState("starter");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    const incoming = Array.isArray(plan) ? plan[0] : plan;
    const normalized = String(incoming || "").toLowerCase();
    if (VALID_PLAN_IDS.has(normalized)) {
      setSelectedPlanId(normalized);
    }
  }, [plan]);

  const PRICING_PLANS: PricingPlan[] = [
    {
      id: "starter",
      name: t("subscription_screen.starter"),
      price: "4.99",
      description: t("subscription_screen.descriptions.starter"),
      features: [
        { text: t("subscription_screen.features.up_to_15_ads") },
        { text: t("subscription_screen.features.ads_active_30_days") },
        { text: t("subscription_screen.features.basic_analytics") },
        { text: t("subscription_screen.features.free_weekly_boost") },
      ],
    },
    {
      id: "pro",
      name: t("subscription_screen.pro"),
      price: "14.99",
      description: t("subscription_screen.descriptions.pro"),
      features: [
        { text: t("subscription_screen.features.up_to_50_ads") },
        { text: t("subscription_screen.features.ads_active_60_days") },
        { text: t("subscription_screen.features.top_priority") },
        { text: t("subscription_screen.features.seller_profile") },
        { text: t("subscription_screen.features.5_boosts") },
      ],
    },
    {
      id: "business",
      name: t("subscription_screen.business"),
      price: "29.99",
      description: t("subscription_screen.descriptions.business"),
      features: [
        { text: t("subscription_screen.features.unlimited_ads") },
        { text: t("subscription_screen.features.ads_active_120_days") },
        { text: t("subscription_screen.features.verified_badge") },
        { text: t("subscription_screen.features.advanced_analytics") },
        { text: t("subscription_screen.features.unlimited_boosts") },
      ],
    },
  ];

  const handleContinue = async () => {
    if (isProcessingPayment) return;

    if (!userId) {
      Alert.alert("Sign in required", "Please sign in before purchasing a plan.");
      return;
    }

    setIsProcessingPayment(true);

    try {
      const token = await getToken({});
      if (!token) {
        throw new Error("Could not get auth token.");
      }

      const authSupabase = createClerkSupabaseClient(token);

      const { data: createData, error: createError } =
        await authSupabase.functions.invoke("create-stripe-payment-intent", {
          body: {
            planId: selectedPlanId,
          },
        });

      if (createError) {
        throw new Error(createError.message || "Unable to start payment.");
      }

      const paymentSetup = createData as CreateIntentResponse | null;
      if (!paymentSetup?.clientSecret || !paymentSetup?.paymentIntentId) {
        throw new Error("Payment setup failed.");
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "PhsarOne",
        paymentIntentClientSecret: paymentSetup.clientSecret,
        returnURL: Linking.createURL("stripe-redirect"),
        allowsDelayedPaymentMethods: false,
      });

      if (initError) {
        throw new Error(initError.message || "Could not initialize payment sheet.");
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          return;
        }
        throw new Error(presentError.message || "Payment did not complete.");
      }

      const { data: confirmData, error: confirmError } =
        await authSupabase.functions.invoke("confirm-stripe-payment", {
          body: {
            paymentIntentId: paymentSetup.paymentIntentId,
            planId: selectedPlanId,
          },
        });

      if (confirmError) {
        throw new Error(confirmError.message || "Failed to activate subscription.");
      }

      const confirmResult = confirmData as ConfirmPaymentResponse | null;
      if (!confirmResult?.success) {
        throw new Error("Subscription activation failed.");
      }

      Alert.alert(
        "Subscription updated",
        "Your plan is active and premium features are now unlocked.",
      );
      router.back();
    } catch (paymentError: unknown) {
      const message =
        paymentError instanceof Error
          ? paymentError.message
          : "Something went wrong while processing payment.";
      console.error("Subscription payment error:", paymentError);
      Alert.alert("Payment failed", message);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <CaretLeftIcon size={24} color={themeColors.text} weight="bold" />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>{t("subscription_screen.subscriptions")}</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <PricingCard
        plans={PRICING_PLANS}
        selectedPlanId={selectedPlanId}
        onSelectPlan={setSelectedPlanId}
        onContinue={handleContinue}
        isLoading={isProcessingPayment}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  placeholder: {
    width: 32,
  },
});

