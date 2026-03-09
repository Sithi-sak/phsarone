import { useAuth } from "@clerk/clerk-expo";
import { createClerkSupabaseClient } from "@src/lib/supabase";
import { formatTimeAgo } from "@src/types/productTypes";
import { Database } from "@src/types/supabase";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TradeInboxStatus = "pending" | "accepted" | "declined" | "completed";
export type TradeInboxDirection = "received" | "sent";

export interface TradeInboxItem {
  id: string;
  direction: TradeInboxDirection;
  status: TradeInboxStatus;
  ownerLabel: "From" | "To";
  ownerName: string;
  otherItem: string;
  yourItem: string;
  updatedAt: string;
  updatedAtIso: string | null;
  tradeId: string;
  bidderId: string;
  sellerId: string;
}

type TradeOfferRow = Database["public"]["Tables"]["trade_offers"]["Row"];
type TradeRow = Database["public"]["Tables"]["trades"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];

type TradeLite = Pick<TradeRow, "id" | "title" | "owner_id">;
type UserLite = Pick<UserRow, "id" | "first_name" | "last_name">;
type TradeOfferWithRelations = Pick<
  TradeOfferRow,
  "id" | "bidder_id" | "trade_id" | "offered_item_desc" | "status" | "updated_at" | "created_at"
> & {
  bidder: UserLite | UserLite[] | null;
  trade: TradeLite | TradeLite[] | null;
};

function normalizeStatus(value: string | null | undefined): TradeInboxStatus {
  const raw = String(value || "pending").toLowerCase();
  if (raw === "accepted") return "accepted";
  if (raw === "completed") return "completed";
  if (raw === "declined" || raw === "rejected") return "declined";
  return "pending";
}

function fullName(user: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
  if (!user) return "User";
  const value = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return value || "User";
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function useTradeInbox() {
  const { userId, getToken } = useAuth();

  const [items, setItems] = useState<TradeInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getTokenRef.current({});
      if (!token) throw new Error("Could not get auth token.");

      const authSupabase = createClerkSupabaseClient(token);

      const { data: myTradesData, error: myTradesError } = await authSupabase
        .from("trades")
        .select("id,title,owner_id")
        .eq("owner_id", userId);

      if (myTradesError) throw myTradesError;

      const myTrades = (myTradesData || []) as TradeLite[];
      const myTradeIds = myTrades.map((trade) => trade.id);
      const myTradeIdSet = new Set(myTradeIds);

      const selectColumns =
        "id,bidder_id,trade_id,offered_item_desc,status,updated_at,created_at,bidder:users!trade_offers_bidder_id_fkey(id,first_name,last_name),trade:trades!trade_offers_trade_id_fkey(id,title,owner_id)";

      const receivedResult =
        myTradeIds.length > 0
          ? await authSupabase
              .from("trade_offers")
              .select(selectColumns)
              .in("trade_id", myTradeIds)
              .order("updated_at", { ascending: false })
          : { data: [] as TradeOfferWithRelations[], error: null };

      const sentResult = await authSupabase
        .from("trade_offers")
        .select(selectColumns)
        .eq("bidder_id", userId)
        .order("updated_at", { ascending: false });

      if (receivedResult.error) throw receivedResult.error;
      if (sentResult.error) throw sentResult.error;

      const receivedRows = (receivedResult.data || []) as TradeOfferWithRelations[];
      const sentRows = (sentResult.data || []) as TradeOfferWithRelations[];

      const merged = new Map<string, TradeOfferWithRelations>();
      for (const row of receivedRows) {
        merged.set(row.id, row);
      }
      for (const row of sentRows) {
        if (!merged.has(row.id)) merged.set(row.id, row);
      }

      const rows = Array.from(merged.values());

      const ownerIds = Array.from(
        new Set(
          rows
            .map((row) => firstRelation(row.trade)?.owner_id)
            .filter((id): id is string => Boolean(id) && id !== userId),
        ),
      );

      const ownerNameMap = new Map<string, string>();
      if (ownerIds.length > 0) {
        const { data: ownersData, error: ownersError } = await authSupabase
          .from("users")
          .select("id,first_name,last_name")
          .in("id", ownerIds);

        if (ownersError) throw ownersError;

        for (const owner of (ownersData || []) as UserLite[]) {
          ownerNameMap.set(owner.id, fullName(owner));
        }
      }

      const mappedItems: TradeInboxItem[] = rows
        .map((row) => {
          const trade = firstRelation(row.trade);
          const bidder = firstRelation(row.bidder);

          const tradeId = String(row.trade_id || trade?.id || "");
          if (!tradeId) return null;

          const isReceived =
            (trade?.owner_id && trade.owner_id === userId) || myTradeIdSet.has(tradeId);

          const tradeTitle = trade?.title || "Trade listing";
          const offeredDescription = String(row.offered_item_desc || "Offered item");
          const status = normalizeStatus(row.status);
          const sellerId = String(trade?.owner_id || (isReceived ? userId : ""));

          const ownerName = isReceived
            ? fullName(bidder)
            : ownerNameMap.get(String(trade?.owner_id || "")) || "Trader";

          return {
            id: String(row.id),
            bidderId: String(row.bidder_id || ""),
            direction: isReceived ? "received" : "sent",
            otherItem: isReceived ? offeredDescription : tradeTitle,
            ownerLabel: isReceived ? "From" : "To",
            ownerName,
            sellerId,
            status,
            tradeId,
            updatedAt: formatTimeAgo(row.updated_at || row.created_at, null) || "",
            updatedAtIso: row.updated_at || row.created_at || null,
            yourItem: isReceived ? tradeTitle : offeredDescription,
          };
        })
        .filter((item): item is TradeInboxItem => Boolean(item))
        .sort((a, b) => {
          const aDate = new Date(a.updatedAtIso || 0).getTime();
          const bDate = new Date(b.updatedAtIso || 0).getTime();
          return bDate - aDate;
        });

      setItems(mappedItems);
    } catch (fetchError: unknown) {
      console.error("Error loading trade inbox:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load trade inbox.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const updateOfferStatus = useCallback(
    async (offerId: string, status: TradeInboxStatus) => {
      if (!userId) return false;

      try {
        const token = await getTokenRef.current({});
        if (!token) throw new Error("Could not get auth token.");

        const authSupabase = createClerkSupabaseClient(token);

        const { data: updatedOffer, error: updateError } = await authSupabase
          .from("trade_offers")
          .update({ status })
          .eq("id", offerId)
          .select("id,status");

        if (updateError) throw updateError;
        if (!updatedOffer || updatedOffer.length === 0) {
          throw new Error("Trade offer update was not permitted.");
        }

        const nowIso = new Date().toISOString();
        setItems((prevItems) =>
          prevItems.map((item) =>
            item.id === offerId
              ? {
                  ...item,
                  status,
                  updatedAt: formatTimeAgo(nowIso, null) || item.updatedAt,
                  updatedAtIso: nowIso,
                }
              : item,
          ),
        );

        refresh().catch((refreshError) => {
          console.error("Error refreshing trade inbox after update:", refreshError);
        });

        return true;
      } catch (updateStatusError) {
        console.error("Error updating trade offer status:", updateStatusError);
        return false;
      }
    },
    [refresh, userId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "pending").length,
    [items],
  );

  const acceptedCount = useMemo(
    () => items.filter((item) => item.status === "accepted").length,
    [items],
  );

  return {
    acceptedCount,
    error,
    items,
    loading,
    pendingCount,
    refresh,
    updateOfferStatus,
  };
}

