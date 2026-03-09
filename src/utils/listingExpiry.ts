const LISTING_DURATION_DAYS_BY_PLAN: Record<string, number> = {
  regular: 30,
  starter: 30,
  pro: 60,
  business: 120,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type ListingExpiryInput = {
  createdAt?: string | null;
  metadata?: Record<string, any> | null;
  planType?: string | null;
};

export function normalizePlanType(planType?: string | null): string {
  return String(planType || "regular").toLowerCase();
}

export function getListingDurationDays(planType?: string | null): number {
  const normalized = normalizePlanType(planType);
  return (
    LISTING_DURATION_DAYS_BY_PLAN[normalized] ||
    LISTING_DURATION_DAYS_BY_PLAN.regular
  );
}

export function getListingExpiryDate(input: ListingExpiryInput): Date | null {
  const metadataExpiry = input.metadata?.listing_expires_at;
  if (typeof metadataExpiry === "string") {
    const parsed = new Date(metadataExpiry);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (!input.createdAt) return null;

  const created = new Date(input.createdAt);
  if (Number.isNaN(created.getTime())) return null;

  const days = getListingDurationDays(input.planType);
  return new Date(created.getTime() + days * MS_PER_DAY);
}

export function isListingExpired(
  input: ListingExpiryInput,
  now = new Date(),
): boolean {
  const expiryDate = getListingExpiryDate(input);
  if (!expiryDate) return false;
  return expiryDate.getTime() <= now.getTime();
}

export function getDaysUntilListingExpiry(
  input: ListingExpiryInput,
  now = new Date(),
): number | null {
  const expiryDate = getListingExpiryDate(input);
  if (!expiryDate) return null;
  return Math.ceil((expiryDate.getTime() - now.getTime()) / MS_PER_DAY);
}

export function getEffectiveListingStatus(
  status: string | null | undefined,
  input: ListingExpiryInput,
): string {
  const currentStatus = String(status || "active").toLowerCase();
  if (currentStatus !== "active") return currentStatus;
  return isListingExpired(input) ? "expired" : "active";
}

export function createListingExpiryFromNow(planType?: string | null): string {
  const durationDays = getListingDurationDays(planType);
  const expiresAt = new Date(Date.now() + durationDays * MS_PER_DAY);
  return expiresAt.toISOString();
}
