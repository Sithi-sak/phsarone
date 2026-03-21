import { useAuth } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import { fetchBlockedUserIds, filterBlockedSellerRows } from "../lib/blockedUsers";
import { supabase } from "../lib/supabase";
import { Database } from "../types/supabase";
import { isListingExpired } from "../utils/listingExpiry";
import { sortPriorityRankedProducts } from "../utils/priorityRanking";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function useProducts() {
  const { userId, getToken } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const blockedSellerIds =
        userId && getToken
          ? await fetchBlockedUserIds(getToken, "blocked sellers home feed")
          : [];
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          seller:users(first_name, last_name, avatar_url, user_type),
          category:categories(name_key)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const visibleProducts = sortPriorityRankedProducts(
        filterBlockedSellerRows((data || []) as any[], blockedSellerIds).filter((item: any) => {
          return !isListingExpired({
            createdAt: item.created_at,
            metadata: item.metadata,
            planType: item.seller?.user_type,
          });
        }),
      );

      setProducts(visibleProducts as Product[]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [userId]);

  return { products, loading, error, refresh: fetchProducts };
}
