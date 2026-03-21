import { normalizePlanType } from "@src/lib/entitlements";

type RankableSeller = {
  user_type?: string | null;
} | null | undefined;

type RankableProduct = {
  created_at?: string | null;
  createdAt?: string | null;
  metadata?: Record<string, any> | null;
  seller?: RankableSeller;
};

function getPriorityWeight(planType?: string | null): number {
  const normalized = normalizePlanType(planType);
  if (normalized === "business") return 2;
  if (normalized === "pro") return 1;
  return 0;
}

function getBoostedAt(metadata?: Record<string, any> | null): number {
  const raw = metadata?.last_boosted_at;
  if (typeof raw !== "string" || raw.length === 0) return 0;
  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getCreatedAt(item: RankableProduct): number {
  const raw = item.created_at || item.createdAt;
  if (typeof raw !== "string" || raw.length === 0) return 0;
  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortPriorityRankedProducts<T extends RankableProduct>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const boostDiff = getBoostedAt(b.metadata) - getBoostedAt(a.metadata);
    if (boostDiff !== 0) return boostDiff;

    const priorityDiff =
      getPriorityWeight(b.seller?.user_type) -
      getPriorityWeight(a.seller?.user_type);
    if (priorityDiff !== 0) return priorityDiff;

    return getCreatedAt(b) - getCreatedAt(a);
  });
}
