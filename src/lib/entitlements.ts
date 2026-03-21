import { Database } from "@src/types/supabase";

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
export type PlanType = "regular" | "starter" | "pro" | "business";
export type SubscriptionStatus =
  | "active"
  | "trailing"
  | "past_due"
  | "canceled"
  | "inactive"
  | "pending_verification";

export type Entitlements = {
  planType: PlanType;
  subscriptionStatus: SubscriptionStatus;
  isPaidPlan: boolean;
  isSubscriptionActive: boolean;
  maxActiveAds: number;
  listingDurationDays: number;
  monthlyBoosts: number;
  hasBasicAnalytics: boolean;
  hasAdvancedAnalytics: boolean;
  hasPriorityRanking: boolean;
  hasVerifiedBadge: boolean;
  hasSellerProfileEnhancement: boolean;
};

const PLAN_LIMITS: Record<
  PlanType,
  Omit<Entitlements, "planType" | "subscriptionStatus" | "isPaidPlan" | "isSubscriptionActive">
> = {
  regular: {
    maxActiveAds: 5,
    listingDurationDays: 30,
    monthlyBoosts: 0,
    hasBasicAnalytics: false,
    hasAdvancedAnalytics: false,
    hasPriorityRanking: false,
    hasVerifiedBadge: false,
    hasSellerProfileEnhancement: false,
  },
  starter: {
    maxActiveAds: 15,
    listingDurationDays: 30,
    monthlyBoosts: 1,
    hasBasicAnalytics: true,
    hasAdvancedAnalytics: false,
    hasPriorityRanking: false,
    hasVerifiedBadge: false,
    hasSellerProfileEnhancement: false,
  },
  pro: {
    maxActiveAds: 50,
    listingDurationDays: 60,
    monthlyBoosts: 5,
    hasBasicAnalytics: true,
    hasAdvancedAnalytics: false,
    hasPriorityRanking: true,
    hasVerifiedBadge: false,
    hasSellerProfileEnhancement: true,
  },
  business: {
    maxActiveAds: 9999,
    listingDurationDays: 120,
    monthlyBoosts: 9999,
    hasBasicAnalytics: true,
    hasAdvancedAnalytics: true,
    hasPriorityRanking: true,
    hasVerifiedBadge: true,
    hasSellerProfileEnhancement: true,
  },
};

export function normalizePlanType(planType?: string | null): PlanType {
  const normalized = String(planType || "regular").toLowerCase();
  if (normalized === "starter") return "starter";
  if (normalized === "pro") return "pro";
  if (normalized === "business") return "business";
  return "regular";
}

export function normalizeSubscriptionStatus(
  status?: string | null,
): SubscriptionStatus {
  const normalized = String(status || "inactive").toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "trailing") return "trailing";
  if (normalized === "past_due") return "past_due";
  if (normalized === "canceled") return "canceled";
  if (normalized === "pending_verification") return "pending_verification";
  return "inactive";
}

export function isSubscriptionActiveStatus(
  status?: string | null,
  currentPeriodEnd?: string | null,
): boolean {
  const normalized = normalizeSubscriptionStatus(status);
  const periodEnd = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : NaN;
  const hasFuturePeriodEnd =
    !Number.isNaN(periodEnd) && periodEnd > Date.now();

  return (
    normalized === "active" ||
    normalized === "trailing" ||
    normalized === "past_due" ||
    (normalized === "canceled" && hasFuturePeriodEnd)
  );
}

export function getPlanTypeFromSubscription(
  subscription?: Pick<SubscriptionRow, "plan_type" | "status" | "current_period_end"> | null,
  fallbackUserType?: string | null,
): PlanType {
  if (
    subscription &&
    isSubscriptionActiveStatus(
      subscription.status,
      subscription.current_period_end,
    )
  ) {
    return normalizePlanType(subscription.plan_type);
  }

  return normalizePlanType(fallbackUserType);
}

export function getEntitlements(args?: {
  subscription?: Pick<SubscriptionRow, "plan_type" | "status" | "current_period_end"> | null;
  fallbackUserType?: string | null;
}): Entitlements {
  const subscriptionStatus = normalizeSubscriptionStatus(args?.subscription?.status);
  const planType = getPlanTypeFromSubscription(
    args?.subscription,
    args?.fallbackUserType,
  );
  const plan = PLAN_LIMITS[planType];
  const isSubscriptionActive = isSubscriptionActiveStatus(
    subscriptionStatus,
    args?.subscription?.current_period_end,
  );
  const isPaidPlan = planType !== "regular";

  return {
    planType,
    subscriptionStatus,
    isPaidPlan,
    isSubscriptionActive,
    ...plan,
  };
}
