import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";

const BLOCKED_USERS_AUTH_OPTIONS = {
  timeoutMs: 45000,
  retries: 2,
} as const;

const BLOCKED_USERS_CACHE_TTL_MS = 60_000;

type ClerkGetToken = (options?: Record<string, unknown>) => Promise<string | null>;

type BlockedUsersCacheEntry = {
  ids: string[];
  fetchedAt: number;
  inFlight?: Promise<string[]>;
};

const blockedUsersCache = new Map<string, BlockedUsersCacheEntry>();

type FetchBlockedUserIdsOptions = {
  cacheKey?: string | null;
  forceRefresh?: boolean;
};

export async function fetchBlockedUserIds(
  getToken: ClerkGetToken,
  context: string,
  options?: FetchBlockedUserIdsOptions,
) {
  const cacheKey = options?.cacheKey?.trim();
  const existingEntry = cacheKey ? blockedUsersCache.get(cacheKey) : undefined;
  const isFresh =
    existingEntry &&
    Date.now() - existingEntry.fetchedAt < BLOCKED_USERS_CACHE_TTL_MS;

  if (!options?.forceRefresh && existingEntry?.inFlight) {
    return existingEntry.inFlight;
  }

  if (!options?.forceRefresh && isFresh) {
    return existingEntry.ids;
  }

  const request = (async () => {
    try {
      const token = await getAuthToken(getToken, context, BLOCKED_USERS_AUTH_OPTIONS);
      const authSupabase = createClerkSupabaseClient(token);
      const { data, error } = await authSupabase
        .from("blocked_users")
        .select("blocked_id");

      if (error) throw error;

      const ids = (data || []).map((row) => row.blocked_id);

      if (cacheKey) {
        blockedUsersCache.set(cacheKey, {
          ids,
          fetchedAt: Date.now(),
        });
      }

      return ids;
    } catch (error) {
      console.warn("Blocked users fetch warning:", error);
      if (cacheKey && existingEntry) {
        return existingEntry.ids;
      }
      return [] as string[];
    } finally {
      if (cacheKey) {
        const current = blockedUsersCache.get(cacheKey);
        if (current?.inFlight) {
          blockedUsersCache.set(cacheKey, {
            ids: current.ids,
            fetchedAt: current.fetchedAt,
          });
        }
      }
    }
  })();

  if (cacheKey) {
    blockedUsersCache.set(cacheKey, {
      ids: existingEntry?.ids || [],
      fetchedAt: existingEntry?.fetchedAt || 0,
      inFlight: request,
    });
  }

  return request;
}

export function clearBlockedUsersCache(cacheKey?: string | null) {
  if (!cacheKey) {
    blockedUsersCache.clear();
    return;
  }

  blockedUsersCache.delete(cacheKey);
}

export async function refreshBlockedUserIds(
  getToken: ClerkGetToken,
  context: string,
  cacheKey?: string | null,
) {
  try {
    return fetchBlockedUserIds(getToken, context, {
      cacheKey,
      forceRefresh: true,
    });
  } catch {
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
