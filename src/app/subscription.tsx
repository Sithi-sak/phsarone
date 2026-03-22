import { useAuth } from "@clerk/clerk-expo";
import { useStripe } from "@stripe/stripe-react-native";
import ActionStatusModal from "@src/components/shared_components/ActionStatusModal";
import { ThemedText } from "@src/components/shared_components/ThemedText";
import PricingCard, {
  PricingPlan,
} from "@src/components/subscription/PricingCard";
import { getAuthToken } from "@src/lib/auth";
import useThemeColor from "@src/hooks/useThemeColor";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";
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
const PAYMENT_NETWORK_TIMEOUT_MS = 20000;
const PAYMENT_SHEET_INIT_TIMEOUT_MS = 30000;
const AUTH_TIMEOUT_MS = 30000;
const AUTH_RETRIES = 1;

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out. Check network and service configuration.`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export default function SubscriptionPage() {
  const router = useRouter();
  const themeColors = useThemeColor();
  const { t } = useTranslation();
  const { userId, getToken } = useAuth();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { plan } = useLocalSearchParams<{ plan?: string | string[] }>();

  const [selectedPlanId, setSelectedPlanId] = useState("starter");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [checkoutStatusPrompt, setCheckoutStatusPrompt] = useState<{
    description: string;
    title: string;
    tone: "error" | "info" | "success";
    visible: boolean;
  }>({
    description: "",
    title: "",
    tone: "success",
    visible: false,
  });

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
      setCheckoutStatusPrompt({
        description: "Please sign in before purchasing a plan.",
        title: "Sign in required",
        tone: "info",
        visible: true,
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      console.log("[Subscription] Starting checkout for plan:", selectedPlanId);
      console.log("[Subscription] Getting Clerk token");
      const token = await getAuthToken(getToken, "subscription checkout", {
        retries: AUTH_RETRIES,
        timeoutMs: AUTH_TIMEOUT_MS,
      });

      const authSupabase = createClerkSupabaseClient(token);

      console.log("[Subscription] Creating payment intent");
      const { data: createData, error: createError } =
        await withTimeout(
          authSupabase.functions.invoke("create-stripe-payment-intent", {
            body: {
              planId: selectedPlanId,
            },
          }),
          PAYMENT_NETWORK_TIMEOUT_MS,
          "Payment setup",
        );

      if (createError) {
        throw new Error(createError.message || "Unable to start payment.");
      }

      const paymentSetup = createData as CreateIntentResponse | null;
      if (!paymentSetup?.clientSecret || !paymentSetup?.paymentIntentId) {
        throw new Error("Payment setup failed.");
      }

      console.log("[Subscription] Initializing payment sheet");
      const { error: initError } = await withTimeout(
        initPaymentSheet({
          merchantDisplayName: "PhsarOne",
          paymentIntentClientSecret: paymentSetup.clientSecret,
          returnURL: Linking.createURL("stripe-redirect"),
          allowsDelayedPaymentMethods: false,
        }),
        PAYMENT_SHEET_INIT_TIMEOUT_MS,
        "Payment sheet initialization",
      );

      if (initError) {
        throw new Error(initError.message || "Could not initialize payment sheet.");
      }

      console.log("[Subscription] Presenting payment sheet");
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          console.log("[Subscription] Payment sheet canceled by user");
          return;
        }
        throw new Error(presentError.message || "Payment did not complete.");
      }

      console.log("[Subscription] Confirming payment with backend");
      const { data: confirmData, error: confirmError } =
        await withTimeout(
          authSupabase.functions.invoke("confirm-stripe-payment", {
            body: {
              paymentIntentId: paymentSetup.paymentIntentId,
              planId: selectedPlanId,
            },
          }),
          PAYMENT_NETWORK_TIMEOUT_MS,
          "Payment confirmation",
        );

      if (confirmError) {
        throw new Error(confirmError.message || "Failed to activate subscription.");
      }

      const confirmResult = confirmData as ConfirmPaymentResponse | null;
      if (!confirmResult?.success) {
        throw new Error("Subscription activation failed.");
      }

      setCheckoutStatusPrompt({
        description: "Your plan is active and premium features are now unlocked.",
        title: "Subscription updated",
        tone: "success",
        visible: true,
      });
      console.log("[Subscription] Checkout completed successfully");
    } catch (paymentError: unknown) {
      const message =
        paymentError instanceof Error
          ? paymentError.message
          : "Something went wrong while processing payment.";
      console.error("Subscription payment error:", paymentError);
      setCheckoutStatusPrompt({
        description: message,
        title: "Payment failed",
        tone: "error",
        visible: true,
      });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ActionStatusModal
        visible={checkoutStatusPrompt.visible}
        title={checkoutStatusPrompt.title}
        description={checkoutStatusPrompt.description}
        tone={checkoutStatusPrompt.tone}
        actionLabel={checkoutStatusPrompt.tone === "success" ? "Continue" : "OK"}
        onClose={() => {
          const shouldGoBack = checkoutStatusPrompt.tone === "success";
          setCheckoutStatusPrompt((current) => ({
            ...current,
            visible: false,
          }));
          if (shouldGoBack) {
            router.back();
          }
        }}
      />
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
