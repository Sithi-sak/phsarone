import { Platform } from "react-native";
import { filterBlockedSellerRows } from "@src/lib/blockedUsers";
import { supabase } from "@src/lib/supabase";
import { isListingExpired } from "@src/utils/listingExpiry";

type RankedIdResult = {
  id: string;
  final_score?: number;
  semantic_score?: number;
};

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
    return fetchProductsByIds(ids, blockedSellerIds);
  } catch (error) {
    console.warn("AI search fallback warning:", error);
    return fallbackKeywordSearch(normalizedQuery, blockedSellerIds);
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
