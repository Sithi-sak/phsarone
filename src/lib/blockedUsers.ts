import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";

const BLOCKED_USERS_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

type ClerkGetToken = (options?: Record<string, unknown>) => Promise<string | null>;

export async function fetchBlockedUserIds(
  getToken: ClerkGetToken,
  context: string,
) {
  try {
    const token = await getAuthToken(getToken, context, BLOCKED_USERS_AUTH_OPTIONS);
    const authSupabase = createClerkSupabaseClient(token);
    const { data, error } = await authSupabase
      .from("blocked_users")
      .select("blocked_id");

    if (error) throw error;

    return (data || []).map((row) => row.blocked_id);
  } catch (error) {
    console.warn("Blocked users fetch warning:", error);
    return [] as string[];
  }
}

export function filterBlockedSellerRows<T extends { seller_id?: string | null }>(
  rows: T[],
  blockedSellerIds: string[],
) {
  if (!blockedSellerIds.length) return rows;
  const blockedSet = new Set(blockedSellerIds);
  return rows.filter((row) => !row.seller_id || !blockedSet.has(row.seller_id));
}
