import { useAuth } from "@clerk/clerk-expo";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
import { createClerkSupabaseClient } from "../lib/supabase";
import {
  createListingExpiryFromNow,
  normalizePlanType,
} from "../utils/listingExpiry";

// Mapping frontend category keys ("1", "2"...) to the fixed database UUIDs
const CATEGORY_UUID_MAP: Record<string, string> = {
  "1": "10000000-0000-0000-0000-000000000001", // smart_phone
  "2": "20000000-0000-0000-0000-000000000001", // vehicles
  "3": "30000000-0000-0000-0000-000000000001", // beauty
  "4": "40000000-0000-0000-0000-000000000001", // furniture
  "5": "50000000-0000-0000-0000-000000000001", // clothing
  "6": "60000000-0000-0000-0000-000000000001", // computer
  "7": "70000000-0000-0000-0000-000000000001", // real_estates
  "8": "80000000-0000-0000-0000-000000000001", // electronic
};

// Reverse map for editing
const UUID_TO_CATEGORY_ID: Record<string, string> = Object.entries(
  CATEGORY_UUID_MAP,
).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {} as Record<string, string>);

export function usePostProduct() {
  const { getToken, userId } = useAuth();
  const [isPosting, setIsPosting] = useState(false);

  const uploadImage = async (uri: string, supabase: any) => {
    // If it's already a public URL (e.g. from an existing product), skip upload
    if (uri.startsWith("http")) return uri;

    try {
      if (!userId)
        throw new Error("User ID is missing. Please sign in again.");

      const fileName = `${userId}/${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.jpg`;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64",
      });

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, decode(base64), {
          contentType: "image/jpeg",
          cacheControl: "31536000",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const fetchUserPlanType = async (supabase: any) => {
    if (!userId) return "regular";

    try {
      const { data, error } = await supabase
        .from("users")
        .select("user_type")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return normalizePlanType(data?.user_type);
    } catch (error) {
      console.warn("Failed to resolve user plan type, defaulting to regular:", error);
      return "regular";
    }
  };

  const prepareProductData = async (
    draft: any,
    supabase: any,
    userPlanType: string,
  ) => {
    // 1. Map category
    const dbCategoryId = CATEGORY_UUID_MAP[draft.categoryId] || null;

    // 2. Upload all images first
    const imageUrls = await Promise.all(
      draft.photos.map((uri: string) => uploadImage(uri, supabase)),
    );

    const existingMetadata = (draft.details || {}) as Record<string, any>;
    const listingExpiresAt =
      typeof existingMetadata.listing_expires_at === "string" &&
      existingMetadata.listing_expires_at.length > 0
        ? existingMetadata.listing_expires_at
        : createListingExpiryFromNow(userPlanType);

    // 3. Prepare the data
    return {
      seller_id: userId as string,
      category_id: dbCategoryId,
      title: draft.title || `${draft.subCategory} Listing`,
      description: draft.description,
      price: parseFloat(draft.price) || 0,
      is_negotiable: draft.negotiable || false,
      images: imageUrls,
      location_name: draft.province || "Unknown",
      metadata: {
        ...existingMetadata,
        currency: draft.currency,
        district: draft.district,
        commune: draft.commune,
        location: draft.location,
        mainCategory: draft.mainCategory || "",
        subCategory: draft.subCategory || "",
        discountType: draft.discountType,
        discountValue: draft.discountValue,
        listing_expires_at: listingExpiresAt,
      },
      status: "active",
    };
  };

  const postProduct = async (draft: any) => {
    if (!userId) throw new Error("User ID is missing. Please sign in again.");
    setIsPosting(true);
    try {
      const token = await getToken();
      const supabase = createClerkSupabaseClient(token);
      const userPlanType = await fetchUserPlanType(supabase);
      const productData = await prepareProductData(draft, supabase, userPlanType);

      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } finally {
      setIsPosting(false);
    }
  };

  const updateProduct = async (id: string, draft: any) => {
    if (!userId) throw new Error("User ID is missing. Please sign in again.");
    setIsPosting(true);
    try {
      const token = await getToken();
      const supabase = createClerkSupabaseClient(token);
      const userPlanType = await fetchUserPlanType(supabase);
      const productData = await prepareProductData(draft, supabase, userPlanType);

      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } finally {
      setIsPosting(false);
    }
  };

  const fetchProductForEdit = async (id: string) => {
    try {
      const token = await getToken();
      const supabase = createClerkSupabaseClient(token);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Product not found.");

      const metadata = (data.metadata as Record<string, any> | null) ?? {};

      // Map DB data back to Draft structure
      return {
        categoryId: data.category_id
          ? UUID_TO_CATEGORY_ID[data.category_id] || ""
          : "",
        subCategory: metadata.subCategory || "",
        photos: data.images || [],
        title: data.title || "",
        price: data.price?.toString() || "",
        currency: metadata.currency || "USD",
        discountType: metadata.discountType || "none",
        discountValue: metadata.discountValue || "",
        negotiable: data.is_negotiable || false,
        description: data.description || "",
        details: metadata,
        province: data.location_name || "",
        location: metadata.location || { latitude: 11.5564, longitude: 104.9282 },
        district: metadata.district || "",
        commune: metadata.commune || "",
        contact: {
          chatOnly: true,
          sellerName: "",
          phones: [""] as string[],
          email: "",
        },
      };
    } catch (error) {
      console.error("Fetch for edit error:", error);
      throw error;
    }
  };

  return { postProduct, updateProduct, fetchProductForEdit, isPosting };
}
