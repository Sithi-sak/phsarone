import { useAuth } from "@clerk/clerk-expo";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import { useState } from "react";
import { POST_FIELDS_MAP } from "../constants/postFields";
import { getAuthToken } from "../lib/auth";
import { getEntitlements } from "../lib/entitlements";
import {
  isImageModerationServiceFailure,
  moderateImageAsset,
  shouldBlockImageModeration,
} from "../lib/imageModeration";
import { moderateListingContent } from "../lib/moderation";
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

  const normalizeProductWriteError = (error: unknown) => {
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("ACTIVE_LISTING_LIMIT_REACHED")
    ) {
      return new Error(
        "You have reached your active listing limit for the current plan. Upgrade your plan or free up a slot first.",
      );
    }

    return error;
  };

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

  const assertActiveListingCapacity = async (
    supabase: any,
    userPlanType: string,
    productIdToExclude?: string,
  ) => {
    if (!userId) return;

    const { maxActiveAds, planType } = getEntitlements({
      fallbackUserType: userPlanType,
    });

    const countQuery = supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", userId)
      .eq("status", "active");

    if (productIdToExclude) {
      countQuery.neq("id", productIdToExclude);
    }

    const { count, error } = await countQuery;

    if (error) throw error;

    if ((count || 0) >= maxActiveAds) {
      const planLabel =
        planType.charAt(0).toUpperCase() + planType.slice(1);
      throw new Error(
        `You have reached your ${planLabel} plan limit of ${maxActiveAds} active listings. Upgrade your plan or pause/sell another listing first.`,
      );
    }
  };

  const prepareProductData = async (
    draft: any,
    supabase: any,
    userPlanType: string,
    status: "active" | "draft" = "active",
  ) => {
    // 1. Map category
    const dbCategoryId = CATEGORY_UUID_MAP[draft.categoryId] || null;

    // 2. Upload all images first
    const imageUrls = await Promise.all(
      draft.photos.map((uri: string) => uploadImage(uri, supabase)),
    );

    const existingMetadata = (draft.details || {}) as Record<string, any>;
    const detailLocationText =
      typeof existingMetadata.location === "string"
        ? existingMetadata.location
        : typeof existingMetadata.locationText === "string"
          ? existingMetadata.locationText
          : "";
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
        locationText: detailLocationText,
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
      status,
    };
  };

  const assertListingAllowed = (draft: any) => {
    const moderation = moderateListingContent({
      title: draft.title,
      description: draft.description,
      subCategory: draft.subCategory,
      metadata: draft.details,
    });

    if (moderation.outcome === "block") {
      throw new Error(
        `This listing contains prohibited content (${moderation.matches.join(", ")}). Weapons, explosives, drugs, and explicit adult listings are not allowed.`,
      );
    }

    if (moderation.outcome === "review") {
      throw new Error(
        `This listing contains restricted content (${moderation.matches.join(", ")}). Please remove unsafe terms before posting.`,
      );
    }
  };

  const assertImagesAllowed = async (draft: any) => {
    const photos = Array.isArray(draft?.photos) ? draft.photos : [];

    for (const uri of photos) {
      if (typeof uri === "string" && /^https?:\/\//i.test(uri)) {
        continue;
      }
      let moderation;
      try {
        moderation = await moderateImageAsset(uri);
      } catch (error) {
        if (isImageModerationServiceFailure(error)) {
          console.warn("Image moderation unavailable during listing submit:", error);
          continue;
        }
        throw error;
      }
      if (shouldBlockImageModeration(moderation)) {
        throw new Error(
          moderation.reasons.length > 0
            ? `One of your images was blocked because it may contain ${moderation.reasons.join(", ")}.`
            : "One of your images was blocked by content moderation.",
        );
      }
    }
  };

  const postProduct = async (draft: any) => {
    if (!userId) throw new Error("User ID is missing. Please sign in again.");
    setIsPosting(true);
    try {
      assertListingAllowed(draft);
      await assertImagesAllowed(draft);
      const token = await getAuthToken(getToken, "product publish");
      const supabase = createClerkSupabaseClient(token);
      const userPlanType = await fetchUserPlanType(supabase);
      await assertActiveListingCapacity(supabase, userPlanType);
      const productData = await prepareProductData(
        draft,
        supabase,
        userPlanType,
        "active",
      );

      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw normalizeProductWriteError(error);
    } finally {
      setIsPosting(false);
    }
  };

  const updateProduct = async (id: string, draft: any) => {
    if (!userId) throw new Error("User ID is missing. Please sign in again.");
    setIsPosting(true);
    try {
      assertListingAllowed(draft);
      await assertImagesAllowed(draft);
      const token = await getAuthToken(getToken, "product update");
      const supabase = createClerkSupabaseClient(token);
      const userPlanType = await fetchUserPlanType(supabase);
      await assertActiveListingCapacity(supabase, userPlanType, id);
      const productData = await prepareProductData(
        draft,
        supabase,
        userPlanType,
        "active",
      );

      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw normalizeProductWriteError(error);
    } finally {
      setIsPosting(false);
    }
  };

  const saveDraft = async (draft: any, id?: string) => {
    if (!userId) throw new Error("User ID is missing. Please sign in again.");
    setIsPosting(true);
    try {
      assertListingAllowed(draft);
      await assertImagesAllowed(draft);
      const token = await getAuthToken(getToken, "product draft save");
      const supabase = createClerkSupabaseClient(token);
      const userPlanType = await fetchUserPlanType(supabase);
      const productData = await prepareProductData(
        draft,
        supabase,
        userPlanType,
        "draft",
      );

      const query = id
        ? supabase.from("products").update(productData).eq("id", id)
        : supabase.from("products").insert(productData);

      const { data, error } = await query.select().single();

      if (error) throw error;
      return data;
    } catch (error) {
      throw normalizeProductWriteError(error);
    } finally {
      setIsPosting(false);
    }
  };

  const fetchProductForEdit = async (id: string) => {
    try {
      const token = await getAuthToken(getToken, "product edit fetch", {
        timeoutMs: 45000,
        retries: 2,
      });
      const supabase = createClerkSupabaseClient(token);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Product not found.");

      const metadata = (data.metadata as Record<string, any> | null) ?? {};
      const subCategory = metadata.subCategory || "";
      const detailFields: Array<{ key: string }> =
        (subCategory && POST_FIELDS_MAP[subCategory]) || [];
      const detailKeys = new Set<string>(detailFields.map((field) => field.key));
      const details = Object.fromEntries(
        Array.from(detailKeys).map((key: string) => {
          if (key === "location") {
            return [key, metadata.locationText || ""];
          }
          return [key, metadata[key] ?? ""];
        }),
      );

      // Map DB data back to Draft structure
      return {
        categoryId: data.category_id
          ? UUID_TO_CATEGORY_ID[data.category_id] || ""
          : "",
        subCategory,
        photos: data.images || [],
        title: data.title || "",
        price: data.price?.toString() || "",
        currency: metadata.currency || "USD",
        discountType: metadata.discountType || "none",
        discountValue: metadata.discountValue || "",
        negotiable: data.is_negotiable || false,
        description: data.description || "",
        details,
        province: data.location_name || "",
        location: metadata.location || { latitude: 11.5564, longitude: 104.9282 },
        district: metadata.district || "",
        commune: metadata.commune || "",
        _status: data.status || "active",
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

  return {
    postProduct,
    saveDraft,
    updateProduct,
    fetchProductForEdit,
    isPosting,
  };
}
