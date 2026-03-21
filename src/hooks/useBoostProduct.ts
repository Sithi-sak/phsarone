import { useAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { getAuthToken } from "@src/lib/auth";
import { createClerkSupabaseClient } from "@src/lib/supabase";

type BoostProductResult = {
  boosted_at: string;
  monthly_boost_limit: number;
  monthly_boosts_remaining: number;
  monthly_boosts_used: number;
  plan_type: string;
  product_id: string;
};

function normalizeBoostError(error: unknown): Error {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unable to boost this product.";

  if (message.includes("PRODUCT_BOOST_REQUIRES_PAID_PLAN")) {
    return new Error("Boosts require a paid plan. Upgrade to unlock this feature.");
  }

  if (message.includes("PRODUCT_BOOST_LIMIT_REACHED")) {
    return new Error("You have used all boosts available for your current plan this month.");
  }

  if (message.includes("PRODUCT_MUST_BE_ACTIVE_TO_BOOST")) {
    return new Error("Only active listings can be boosted.");
  }

  if (message.includes("PRODUCT_BOOST_NOT_ALLOWED")) {
    return new Error("You can only boost your own listings.");
  }

  if (message.includes("PRODUCT_NOT_FOUND")) {
    return new Error("This listing could not be found.");
  }

  if (message.includes("AUTH_REQUIRED")) {
    return new Error("Please sign in again before boosting a listing.");
  }

  return new Error(message);
}

export function useBoostProduct() {
  const { getToken, userId } = useAuth();
  const [boostingProductId, setBoostingProductId] = useState<string | null>(null);

  const boostProduct = async (productId: string): Promise<BoostProductResult> => {
    if (!userId) {
      throw new Error("Please sign in again before boosting a listing.");
    }

    setBoostingProductId(productId);

    try {
      const token = await getAuthToken(getToken, "product boost");
      const authSupabase = createClerkSupabaseClient(token);

      const { data, error } = await authSupabase.rpc("boost_product" as any, {
        target_product_id: productId,
      });

      if (error) {
        throw error;
      }

      return data as BoostProductResult;
    } catch (error) {
      throw normalizeBoostError(error);
    } finally {
      setBoostingProductId(null);
    }
  };

  return {
    boostProduct,
    boostingProductId,
  };
}
