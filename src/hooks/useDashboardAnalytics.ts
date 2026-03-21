import { useAuth } from "@clerk/clerk-expo";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { formatPrice, formatTimeAgo } from "@src/types/productTypes";
import { Database } from "@src/types/supabase";
import { useCallback, useEffect, useRef, useState } from "react";

type AnalyticsClient = ReturnType<typeof createClerkSupabaseClient>;
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type TradeRow = Database["public"]["Tables"]["trades"]["Row"];
type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];

interface ProductSummary extends Pick<ProductRow, "id" | "title" | "price" | "metadata" | "status" | "updated_at" | "created_at" | "category_id"> {}
interface TradeSummary extends Pick<TradeRow, "id" | "title" | "status" | "updated_at" | "created_at" | "category_id" | "owner_id"> {}

export interface DashboardRecentSoldItem {
  id: string;
  title: string;
  subtitle: string;
  price: string;
}

export interface DashboardInsightSegment {
  color: string;
  label: string;
  value: number;
}

export interface DashboardAnalyticsData {
  overview: {
    activeListings: number;
    soldListings: number;
    activeChats: number;
    savedByUsers: number;
    recentSold: DashboardRecentSoldItem[];
  };
  performance: {
    listingViews: number;
    listingViewsDelta: number;
    chatStarts: number;
    chatStartsDelta: number;
    responseRate: number;
    responseRateDelta: number;
    savedItems: number;
    savedItemsDelta: number;
  };
  insights: {
    segments: DashboardInsightSegment[];
  };
}

const DEFAULT_DATA: DashboardAnalyticsData = {
  overview: {
    activeListings: 0,
    soldListings: 0,
    activeChats: 0,
    recentSold: [],
    savedByUsers: 0,
  },
  performance: {
    chatStarts: 0,
    chatStartsDelta: 0,
    listingViews: 0,
    listingViewsDelta: 0,
    responseRate: 0,
    responseRateDelta: 0,
    savedItems: 0,
    savedItemsDelta: 0,
  },
  insights: {
    segments: [{ color: "#9CA3AF", label: "Other", value: 100 }],
  },
};

const SEGMENT_COLORS = ["#FF6D4D", "#FF9440", "#F4C83E", "#6BCB83"];

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}


function humanizeCategoryKey(key: string): string {
  const withSpaces = key.replace(/_/g, " ");
  return withSpaces.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function countByListingIds(
  client: AnalyticsClient,
  table: "analytics_views" | "favorites",
  actorUserId: string,
  productIds: string[],
  tradeIds: string[],
  from?: string,
  to?: string,
): Promise<number> {
  let total = 0;

  if (productIds.length > 0) {
    let query = client
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("product_id", productIds);

    if (table === "analytics_views") {
      query = query.neq("viewer_id", actorUserId);
    } else {
      query = query.neq("user_id", actorUserId);
    }

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);

    const { count, error } = await query;
    if (error) throw error;
    total += count ?? 0;
  }

  if (tradeIds.length > 0) {
    let query = client
      .from(table)
      .select("id", { count: "exact", head: true })
      .in("trade_id", tradeIds);

    if (table === "analytics_views") {
      query = query.neq("viewer_id", actorUserId);
    } else {
      query = query.neq("user_id", actorUserId);
    }

    if (from) query = query.gte("created_at", from);
    if (to) query = query.lt("created_at", to);

    const { count, error } = await query;
    if (error) throw error;
    total += count ?? 0;
  }

  return total;
}

async function fetchInteractionRows(
  client: AnalyticsClient,
  table: "analytics_views" | "favorites",
  actorUserId: string,
  productIds: string[],
  tradeIds: string[],
  from?: string,
): Promise<Array<{ product_id: string | null; trade_id: string | null }>> {
  const rows: Array<{ product_id: string | null; trade_id: string | null }> = [];

  if (productIds.length > 0) {
    let query = client
      .from(table)
      .select("product_id,trade_id")
      .in("product_id", productIds);

    if (table === "analytics_views") {
      query = query.neq("viewer_id", actorUserId);
    } else {
      query = query.neq("user_id", actorUserId);
    }

    if (from) query = query.gte("created_at", from);

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data || []) as Array<{ product_id: string | null; trade_id: string | null }>));
  }

  if (tradeIds.length > 0) {
    let query = client
      .from(table)
      .select("product_id,trade_id")
      .in("trade_id", tradeIds);

    if (table === "analytics_views") {
      query = query.neq("viewer_id", actorUserId);
    } else {
      query = query.neq("user_id", actorUserId);
    }

    if (from) query = query.gte("created_at", from);

    const { data, error } = await query;
    if (error) throw error;
    rows.push(...((data || []) as Array<{ product_id: string | null; trade_id: string | null }>));
  }

  return rows;
}

async function computeResponseRate(
  client: AnalyticsClient,
  userId: string,
  from?: string,
  to?: string,
): Promise<number> {
  let query: any = client
    .from("conversations")
    .select("id,created_at")
    .eq("seller_id", userId)
    .not("created_at", "is", null);

  if (from) query = query.gte("created_at", from);
  if (to) query = query.lt("created_at", to);

  const { data: conversations, error: conversationsError } = await query;
  if (conversationsError) throw conversationsError;

  const conversationRows = (conversations || []) as Array<{ id: string; created_at: string | null }>;
  if (conversationRows.length === 0) return 0;

  const conversationIds = conversationRows.map((item) => item.id);

  const { data: messages, error: messagesError } = await client
    .from("messages")
    .select("conversations_id,sender_id,created_at")
    .in("conversations_id", conversationIds)
    .order("created_at", { ascending: true });

  if (messagesError) throw messagesError;

  const grouped = new Map<string, Array<{ sender_id: string }>>();
  for (const message of (messages || []) as Array<{ conversations_id: string; sender_id: string }>) {
    const bucket = grouped.get(message.conversations_id) || [];
    bucket.push({ sender_id: message.sender_id });
    grouped.set(message.conversations_id, bucket);
  }

  let inboundConversations = 0;
  let repliedConversations = 0;

  for (const conversation of conversationRows) {
    const conversationMessages = grouped.get(conversation.id) || [];
    if (conversationMessages.length === 0) continue;

    const firstSender = conversationMessages[0]?.sender_id;
    if (firstSender === userId) continue;

    inboundConversations += 1;
    const hasReply = conversationMessages.some((message) => message.sender_id === userId);
    if (hasReply) repliedConversations += 1;
  }

  if (inboundConversations === 0) return 0;
  return (repliedConversations / inboundConversations) * 100;
}

function computeTrend(current: number, previous: number): number {
  return current - previous;
}

function normalizeDashboardError(error: unknown): string {
  if (!error) return "";

  if (typeof error === "string") {
    return error.trim();
  }

  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "object") {
    const candidate = error as {
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      message?: unknown;
    };

    const messageParts = [candidate.message, candidate.details, candidate.hint]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .map((part) => part.trim());

    if (messageParts.length > 0) {
      return messageParts.join(" - ");
    }

    if (typeof candidate.code === "string" && candidate.code.trim().length > 0) {
      return `Request failed (${candidate.code.trim()}).`;
    }
  }

  return "";
}

function shouldRetryDashboardError(message: string): boolean {
  if (!message) return true;
  const value = message.toLowerCase();
  return (
    value.includes("network") ||
    value.includes("fetch") ||
    value.includes("timeout") ||
    value.includes("temporar") ||
    value.includes("abort")
  );
}
export function useDashboardAnalytics(enabled = true) {
  const { userId, getToken } = useAuth();

  const [data, setData] = useState<DashboardAnalyticsData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);
  const refresh = useCallback(async (hasRetried = false) => {
    if (!enabled || !userId) {
      setData(DEFAULT_DATA);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken(
        getTokenRef.current,
        "dashboard analytics load",
      );

      const authSupabase = createClerkSupabaseClient(token);

      const [productsResult, tradesResult, activeChatsResult] = await Promise.all([
        authSupabase
          .from("products")
          .select("id,title,price,metadata,status,updated_at,created_at,category_id")
          .eq("seller_id", userId),
        authSupabase
          .from("trades")
          .select("id,title,status,updated_at,created_at,category_id,owner_id")
          .eq("owner_id", userId),
        authSupabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("seller_id", userId),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (tradesResult.error) throw tradesResult.error;
      if (activeChatsResult.error) throw activeChatsResult.error;

      const products = (productsResult.data || []) as ProductSummary[];
      const trades = (tradesResult.data || []) as TradeSummary[];

      const productIds = products.map((product) => product.id);
      const tradeIds = trades.map((trade) => trade.id);

      const activeListings = products.filter((product) => product.status === "active").length;
      const soldProducts = products
        .filter((product) => product.status === "sold")
        .sort((a, b) => {
          const aDate = new Date(a.updated_at || a.created_at || 0).getTime();
          const bDate = new Date(b.updated_at || b.created_at || 0).getTime();
          return bDate - aDate;
        });

      const soldListings = soldProducts.length;
      const activeChats = activeChatsResult.count ?? 0;

      const savedByUsers = await countByListingIds(
        authSupabase,
        "favorites",
        userId,
        productIds,
        tradeIds,
      );

      const recentSold: DashboardRecentSoldItem[] = soldProducts.slice(0, 3).map((product) => {
        const metadata = (product.metadata || {}) as { currency?: "USD" | "KHR" };
        const currency = metadata.currency === "KHR" ? "KHR" : "USD";
        const soldTime = formatTimeAgo(product.updated_at || product.created_at, null);

        return {
          id: product.id,
          price: formatPrice(product.price, currency),
          subtitle: soldTime ? `Marked sold - ${soldTime}` : "Marked sold",
          title: product.title,
        };
      });

      const currentStart = isoDaysAgo(30);
      const previousStart = isoDaysAgo(60);

      const [listingViewsCurrent, listingViewsPrevious, chatStartsCurrent, chatStartsPrevious, savedItemsCurrent, savedItemsPrevious, responseRateCurrent, responseRatePrevious] =
        await Promise.all([
          countByListingIds(
            authSupabase,
            "analytics_views",
            userId,
          productIds,
            tradeIds,
            currentStart,
          ),
          countByListingIds(
            authSupabase,
            "analytics_views",
            userId,
          productIds,
            tradeIds,
            previousStart,
            currentStart,
          ),
          authSupabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", userId)
            .gte("created_at", currentStart)
            .then((res) => {
              if (res.error) throw res.error;
              return res.count ?? 0;
            }),
          authSupabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .eq("seller_id", userId)
            .gte("created_at", previousStart)
            .lt("created_at", currentStart)
            .then((res) => {
              if (res.error) throw res.error;
              return res.count ?? 0;
            }),
          countByListingIds(
            authSupabase,
            "favorites",
            userId,
          productIds,
            tradeIds,
            currentStart,
          ),
          countByListingIds(
            authSupabase,
            "favorites",
            userId,
          productIds,
            tradeIds,
            previousStart,
            currentStart,
          ),
          computeResponseRate(authSupabase, userId, currentStart),
          computeResponseRate(authSupabase, userId, previousStart, currentStart),
        ]);

      const insightStart = isoDaysAgo(90);
      const scoreByCategory = new Map<string, number>();

      const productCategoryById = new Map<string, string>();
      for (const product of products) {
        if (product.category_id) productCategoryById.set(product.id, product.category_id);
      }

      const tradeCategoryById = new Map<string, string>();
      for (const trade of trades) {
        if (trade.category_id) tradeCategoryById.set(trade.id, trade.category_id);
      }

      const addCategoryScore = (categoryId: string | undefined, score: number) => {
        if (!categoryId) return;
        scoreByCategory.set(categoryId, (scoreByCategory.get(categoryId) || 0) + score);
      };

      const [viewRows, favoriteRows, chatRows] = await Promise.all([
        fetchInteractionRows(
          authSupabase,
          "analytics_views",
          userId,
          productIds,
          tradeIds,
          insightStart,
        ),
        fetchInteractionRows(
          authSupabase,
          "favorites",
          userId,
          productIds,
          tradeIds,
          insightStart,
        ),
        authSupabase
          .from("conversations")
          .select("product_id,trade_id")
          .eq("seller_id", userId)
          .gte("created_at", insightStart)
          .then((res) => {
            if (res.error) throw res.error;
            return (res.data || []) as Array<{ product_id: string | null; trade_id: string | null }>;
          }),
      ]);

      for (const row of viewRows) {
        addCategoryScore(productCategoryById.get(row.product_id || ""), 1);
        addCategoryScore(tradeCategoryById.get(row.trade_id || ""), 1);
      }

      for (const row of favoriteRows) {
        addCategoryScore(productCategoryById.get(row.product_id || ""), 2);
        addCategoryScore(tradeCategoryById.get(row.trade_id || ""), 2);
      }

      for (const row of chatRows) {
        addCategoryScore(productCategoryById.get(row.product_id || ""), 3);
        addCategoryScore(tradeCategoryById.get(row.trade_id || ""), 3);
      }

      const categoryIds = Array.from(scoreByCategory.keys());
      const categoryNameMap = new Map<string, string>();

      if (categoryIds.length > 0) {
        const { data: categoriesData, error: categoriesError } = await authSupabase
          .from("categories")
          .select("id,name_key")
          .in("id", categoryIds);

        if (categoriesError) throw categoriesError;

        for (const category of (categoriesData || []) as Pick<CategoryRow, "id" | "name_key">[]) {
          categoryNameMap.set(category.id, category.name_key);
        }
      }

      const scoreEntries = Array.from(scoreByCategory.entries())
        .map(([categoryId, score]) => ({
          categoryId,
          label: humanizeCategoryKey(categoryNameMap.get(categoryId) || "Other"),
          score,
        }))
        .sort((a, b) => b.score - a.score);

      let displayEntries = scoreEntries.slice(0, 4);
      if (scoreEntries.length > 4) {
        const overflowScore = scoreEntries
          .slice(4)
          .reduce((sum, entry) => sum + entry.score, 0);

        if (displayEntries.length === 4) {
          displayEntries = [
            ...displayEntries.slice(0, 3),
            {
              categoryId: "other",
              label: "Other",
              score: displayEntries[3].score + overflowScore,
            },
          ];
        }
      }

      const totalInsightScore = displayEntries.reduce((sum, entry) => sum + entry.score, 0);

      let segments: DashboardInsightSegment[];
      if (totalInsightScore <= 0 || displayEntries.length === 0) {
        segments = [{ color: "#9CA3AF", label: "Other", value: 100 }];
      } else {
        const rawPercentages = displayEntries.map((entry) =>
          Math.round((entry.score / totalInsightScore) * 100),
        );
        const percentSum = rawPercentages.reduce((sum, value) => sum + value, 0);
        if (percentSum !== 100 && rawPercentages.length > 0) {
          rawPercentages[0] += 100 - percentSum;
        }

        segments = displayEntries.map((entry, index) => ({
          color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
          label: entry.label,
          value: Math.max(0, rawPercentages[index] || 0),
        }));
      }

      setData({
        overview: {
          activeChats,
          activeListings,
          recentSold,
          savedByUsers,
          soldListings,
        },
        performance: {
          chatStarts: chatStartsCurrent,
          chatStartsDelta: computeTrend(chatStartsCurrent, chatStartsPrevious),
          listingViews: listingViewsCurrent,
          listingViewsDelta: computeTrend(listingViewsCurrent, listingViewsPrevious),
          responseRate: Math.round(responseRateCurrent),
          responseRateDelta: Math.round(responseRateCurrent - responseRatePrevious),
          savedItems: savedItemsCurrent,
          savedItemsDelta: computeTrend(savedItemsCurrent, savedItemsPrevious),
        },
        insights: {
          segments,
        },
      });
    } catch (fetchError: unknown) {
      const normalizedError = normalizeDashboardError(fetchError);

      if (!hasRetried && shouldRetryDashboardError(normalizedError)) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return refresh(true);
      }

      console.warn(
        "Dashboard analytics warning:",
        normalizedError || "Unknown dashboard analytics error",
      );
      setError(normalizedError || "Failed to load dashboard analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    data,
    error,
    loading,
    refresh,
  };
}








