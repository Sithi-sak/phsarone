import { ThemedText } from "@src/components/shared_components/ThemedText";
import { ArrowRightIcon, CheckIcon, SparkleIcon } from "phosphor-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export interface PricingFeature {
  text: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  description?: string;
  features: PricingFeature[];
}

interface PricingCardProps {
  plans: PricingPlan[];
  selectedPlanId: string;
  onSelectPlan: (planId: string) => void;
  onContinue: () => void;
  isLoading?: boolean;
}

export default function PricingCard({
  plans,
  selectedPlanId,
  onSelectPlan,
  onContinue,
  isLoading = false,
}: PricingCardProps) {
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={styles.segmentWrap}>
        {plans.map((plan) => {
          const isSelected = plan.id === selectedPlanId;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.segmentItem,
                isSelected && styles.segmentItemSelected,
              ]}
              onPress={() => onSelectPlan(plan.id)}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <ThemedText
                style={[
                  styles.segmentText,
                  isSelected && styles.segmentTextSelected,
                ]}
              >
                {plan.name}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.heroPanel}>
        <View style={styles.iconBox}>
          <SparkleIcon size={20} color="#111827" weight="regular" />
        </View>

        <ThemedText style={styles.planTitle}>{selectedPlan.name}</ThemedText>
        <ThemedText style={styles.planDescription}>
          {selectedPlan.description ||
            t("subscription_screen.default_description")}
        </ThemedText>

        <View style={styles.priceRow}>
          <ThemedText style={styles.currencySymbol}>$</ThemedText>
          <ThemedText style={styles.priceValue}>
            {selectedPlan.price}
          </ThemedText>
          <ThemedText style={styles.monthInline}>/month</ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, isLoading && styles.ctaButtonDisabled]}
          onPress={onContinue}
          disabled={isLoading}
          activeOpacity={0.9}
        >
          {isLoading ? (
            <ActivityIndicator color="#111827" size="small" />
          ) : (
            <>
              <ThemedText style={styles.ctaButtonText}>
                {t("subscription_screen.continue_with_plan")}
              </ThemedText>
              <ArrowRightIcon size={18} color="#111827" weight="regular" />
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.featureList}>
        {selectedPlan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <CheckIcon size={14} color="#111827" weight="bold" />
            <ThemedText style={styles.featureText}>{feature.text}</ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.coreTag}>
        <ThemedText style={styles.coreTagText}>
          {t("subscription_screen.trade_core_access")}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    padding: 16,
    marginHorizontal: 16,
  },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 999,
    padding: 2,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: "center",
  },
  segmentItemSelected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  segmentTextSelected: {
    color: "#111827",
  },
  heroPanel: {
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 99,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  planTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.6,
  },
  planDescription: {
    marginTop: 8,
    fontSize: 14,
    color: "#475569",
  },
  priceRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "500",
    color: "#0F172A",
    lineHeight: 48,
    marginRight: 2,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -1,
  },
  monthInline: {
    fontSize: 20,
    fontWeight: "500",
    color: "#475569",
    marginBottom: 6,
    marginLeft: 4,
  },
  ctaButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  featureList: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 6,
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 24,
    fontWeight: "500",
  },
  coreTag: {
    marginTop: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coreTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E3A8A",
  },
});
