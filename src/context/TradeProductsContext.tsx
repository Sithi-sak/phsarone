import { supabase } from "@src/lib/supabase";
import { TradeProduct } from "@src/types/productTypes";
import { Database } from "@src/types/supabase";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type TradeRow = Database["public"]["Tables"]["trades"]["Row"];

interface TradeProductsContextType {
  products: TradeProduct[];
  loading: boolean;
  addProduct: (product: TradeProduct) => void;
  refreshProducts: () => Promise<void>;
  getProductById: (id: string) => TradeProduct | undefined;
}

const DEFAULT_COORDINATES = {
  latitude: 11.5564,
  longitude: 104.9282,
};

const TradeProductsContext = createContext<
  TradeProductsContextType | undefined
>(undefined);

const getTimeAgo = (
  postedDate: string | null,
): TradeProduct["timeAgo"] => {
  const now = Date.now();
  const posted = postedDate ? new Date(postedDate).getTime() : now;
  const diffMinutes = Math.max(0, Math.floor((now - posted) / 60000));

  if (diffMinutes < 60) {
    return { value: diffMinutes, unit: "minutes" };
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return { value: diffHours, unit: "hours" };
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return { value: diffDays, unit: "days" };
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return { value: diffWeeks, unit: "weeks" };
  }

  return { value: Math.max(1, Math.floor(diffDays / 30)), unit: "months" };
};

const mapTradeRowToTradeProduct = (row: TradeRow): TradeProduct => {
  const metadata = (row.metadata as Record<string, any> | null) ?? {};

  const coordinates = metadata.coordinates;
  const normalizedCoordinates =
    coordinates &&
    typeof coordinates.latitude === "number" &&
    typeof coordinates.longitude === "number"
      ? coordinates
      : DEFAULT_COORDINATES;

  const lookingForName =
    (row.looking_for && row.looking_for.trim()) ||
    metadata.lookingForName ||
    "";

  return {
    id: row.id,
    images: row.images ?? [],
    title: row.title,
    owner_id: row.owner_id,
    status: row.status,
    seller: metadata.sellerName || metadata.owner?.name || row.owner_id,
    timeAgo: getTimeAgo(row.created_at),
    lookingFor: [
      {
        name: lookingForName,
        description: metadata.lookingForDescription || undefined,
      },
    ],
    condition: metadata.condition || "good",
    originalPrice: Number(metadata.originalPrice ?? 0),
    province: metadata.province || row.location_name || "phnomPenh",
    district: metadata.district || "",
    commune: metadata.commune || "",
    coordinates: normalizedCoordinates,
    description: row.description || "",
    telephone: metadata.telephone || "",
    estimatedTradeValueRange: metadata.estimatedTradeValueRange || "",
    owner: metadata.owner || {
      name: metadata.sellerName || row.owner_id,
      isVerified: false,
      avatar: "",
    },
    postedDate: row.created_at || undefined,
  };
};

export function TradeProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<TradeProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trades")
        .select(`
          *,
          owner:users(id, first_name, last_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setProducts((data ?? []).map((row: any) => {
        const product = mapTradeRowToTradeProduct(row);
        
        // If we have joined user data, override the owner info
        if (row.owner) {
          const fullName = [row.owner.first_name, row.owner.last_name].filter(Boolean).join(" ");
          product.owner = {
            name: fullName || product.owner.name, // fallback to existing name if fullName is empty
            isVerified: product.owner.isVerified,
            avatar: row.owner.avatar_url || product.owner.avatar,
          };
          
          // Also update the top-level seller field for consistency
          product.seller = product.owner.name;
        }
        
        return product;
      }));
    } catch (error) {
      console.error("Failed to fetch trades:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  const addProduct = (product: TradeProduct) => {
    setProducts((prev) => [product, ...prev]);
  };

  const getProductById = (id: string): TradeProduct | undefined => {
    return products.find((p) => p.id === id);
  };

  return (
    <TradeProductsContext.Provider
      value={{ products, loading, addProduct, refreshProducts, getProductById }}
    >
      {children}
    </TradeProductsContext.Provider>
  );
}

export function useTradeProducts() {
  const context = useContext(TradeProductsContext);
  if (!context) {
    throw new Error(
      "useTradeProducts must be used within TradeProductsProvider",
    );
  }
  return context;
}

export default TradeProductsProvider;
