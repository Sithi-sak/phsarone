import { ThemedText } from "@src/components/shared_components/ThemedText";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRightIcon, CheckCircleIcon } from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, TouchableOpacity, View } from "react-native";

export interface PricingFeature {
  text: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  features: PricingFeature[];
}

interface PricingCardProps {
  plans: PricingPlan[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
  onContinue: () => void;
}

export default function PricingCard({
  plans,
  selectedPlanId,
  onSelectPlan,
  onContinue,
}: PricingCardProps) {
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const { t } = useTranslation();

  return (
    <LinearGradient
      colors={["#2D5F4E", "#1A3A2E", "#0D1F19"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.card}
    >
      {/* Plan Tabs */}
      <View style={styles.tabContainer}>
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.tab, isSelected && styles.tabSelected]}
              onPress={() => onSelectPlan(plan.id)}
            >
              <ThemedText
                style={[styles.tabText, isSelected && styles.tabTextSelected]}
              >
                {plan.name}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Price Display */}
      <View style={styles.priceContainer}>
        <ThemedText style={styles.currencySymbol}>$</ThemedText>
        <ThemedText style={styles.price}>{selectedPlan.price}</ThemedText>
      </View>
      <ThemedText style={styles.perMonth}>
        {t("subscription_screen.per_month")}
      </ThemedText>

      {/* Features List */}
      <View style={styles.featuresContainer}>
        {selectedPlan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <CheckCircleIcon size={20} color="#FFFFFF" weight="regular" />
            <ThemedText style={styles.featureText}>{feature.text}</ThemedText>
          </View>
        ))}
      </View>

      {/* Continue Button */}
      <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
        <ThemedText style={styles.continueButtonText}>
          {t("subscription_screen.continue_with_plan")}
        </ThemedText>
        <ArrowRightIcon size={18} color="#FFFFFF" weight="bold" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderCurve: "continuous",
    padding: 24,
    marginHorizontal: 16,
    marginTop: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
  },
  tabSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
  },
  tabTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "center",
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: "300",
    color: "#fff",
    marginTop: 16,
  },
  price: {
    fontSize: 96,
    fontWeight: "400",
    color: "#fff",
    letterSpacing: -2,
  },
  perMonth: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 1,
  },
  featuresContainer: {
    marginBottom: 30,
    marginHorizontal: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: "#FFFFFF",
    marginLeft: 12,
    fontWeight: "400",
  },
  continueButton: {
    backgroundColor: "#2D7A5F",
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
