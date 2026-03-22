import { Platform } from "react-native";
import { filterBlockedSellerRows } from "@src/lib/blockedUsers";
import { supabase } from "@src/lib/supabase";
import { isListingExpired } from "@src/utils/listingExpiry";

type RankedIdResult = {
  id: string;
  final_score?: number;
  semantic_score?: number;
};

function normalizeSearchTokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

const QUERY_TOKEN_ALIASES: Record<string, string[]> = {
  car: ["vehicle", "vehicles", "auto", "automobile", "cars"],
  vehicle: ["car", "cars", "auto", "automobile", "vehicles"],
  phone: ["smartphone", "mobile", "iphone", "android"],
  laptop: ["computer", "notebook", "macbook"],
};

function countQueryTokenMatches(query: string, item: any) {
  const queryTokens = Array.from(new Set(normalizeSearchTokens(query))).filter(
    (token) => token.length >= 3,
  );
  if (queryTokens.length === 0) return 0;

  const haystack = [
    item?.title,
    item?.description,
    item?.search_text,
    item?.location_name,
    item?.category?.name_key,
    item?.subcategory,
    item?.seller?.user_type,
    typeof item?.metadata === "object" ? JSON.stringify(item.metadata) : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return queryTokens.filter((token) => {
    const aliasTokens = QUERY_TOKEN_ALIASES[token] || [];
    return [token, ...aliasTokens].some((candidate) => haystack.includes(candidate));
  }).length;
}

function refineQueryMatches(results: any[], query: string) {
  const queryTokens = Array.from(new Set(normalizeSearchTokens(query))).filter(
    (token) => token.length >= 3,
  );
  if (queryTokens.length < 2 || results.length === 0) {
    return results;
  }

  const scored = results.map((item) => ({
    item,
    tokenMatches: countQueryTokenMatches(query, item),
  }));

  const strongestMatchCount = Math.max(
    ...scored.map((entry) => entry.tokenMatches),
    0,
  );

  if (strongestMatchCount < 2) {
    return results;
  }

  const refined = scored
    .filter((entry) => entry.tokenMatches >= 2)
    .map((entry) => entry.item);

  return refined.length > 0 ? refined : results;
}

const DEFAULT_AI_API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_AI_SEARCH_API_URL || DEFAULT_AI_API_URL;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `AI search request failed with ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchProductsByIds(ids: string[], blockedSellerIds: string[] = []) {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      seller:users(first_name, last_name, avatar_url, user_type),
      category:categories(name_key)
    `)
    .in("id", ids)
    .eq("status", "active");

  if (error) throw error;

  const rows = filterBlockedSellerRows((data || []) as any[], blockedSellerIds);
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((item: any) => {
      return !isListingExpired({
        createdAt: item.created_at,
        metadata: item.metadata,
        planType: item.seller?.user_type,
      });
    });
}

async function fallbackKeywordSearch(query: string, blockedSellerIds: string[] = []) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      seller:users(first_name, last_name, avatar_url, user_type),
      category:categories(name_key)
    `)
    .eq("status", "active")
    .ilike("search_text", `%${query}%`)
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw error;

  return filterBlockedSellerRows((data || []) as any[], blockedSellerIds).filter((item) => {
    return !isListingExpired({
      createdAt: item.created_at,
      metadata: item.metadata,
      planType: item.seller?.user_type,
    });
  });
}

async function fallbackRecentProducts(
  limit = 8,
  blockedSellerIds: string[] = [],
) {
  const { data, error } = await supabase
    .from("products")
    .select(`
      *,
      seller:users(first_name, last_name, avatar_url, user_type),
      category:categories(name_key)
    `)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return filterBlockedSellerRows((data || []) as any[], blockedSellerIds).filter((item) => {
    return !isListingExpired({
      createdAt: item.created_at,
      metadata: item.metadata,
      planType: item.seller?.user_type,
    });
  });
}

export async function searchProductsWithAI(
  query: string,
  blockedSellerIds: string[] = [],
) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  try {
    const payload = await fetchJson<{ results: RankedIdResult[] }>(
      `/semantic-search?q=${encodeURIComponent(normalizedQuery)}`,
    );
    const ids = (payload.results || []).map((row) => row.id);
    const products = await fetchProductsByIds(ids, blockedSellerIds);
    return refineQueryMatches(products, normalizedQuery);
  } catch (error) {
    console.warn("AI search fallback warning:", error);
    const products = await fallbackKeywordSearch(normalizedQuery, blockedSellerIds);
    return refineQueryMatches(products, normalizedQuery);
  }
}

export async function getRecommendedProducts(
  userId?: string | null,
  blockedSellerIds: string[] = [],
) {
  if (!userId) {
    return fallbackRecentProducts(8, blockedSellerIds);
  }

  try {
    const payload = await fetchJson<{ results: RankedIdResult[] }>(
      `/recommendations?user_id=${encodeURIComponent(userId)}`,
    );
    const ids = (payload.results || []).map((row) => row.id);
    if (ids.length === 0) {
      return fallbackRecentProducts(8, blockedSellerIds);
    }
    return fetchProductsByIds(ids, blockedSellerIds);
  } catch (error) {
    console.warn("AI recommendation fallback warning:", error);
    return fallbackRecentProducts(8, blockedSellerIds);
  }
}
