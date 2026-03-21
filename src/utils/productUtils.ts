import { POST_FIELDS_MAP } from "@src/constants/postFields";
import { getEntitlements } from "@src/lib/entitlements";
import { Address, Location, Product, ProductDraft, SellerContact } from "@src/types/productTypes"; // Added ProductDraft
import i18n from "../i18n"; // Added i18n import

export const getProductFields = (subCategory: string) => {
  return POST_FIELDS_MAP[subCategory] || POST_FIELDS_MAP["other"];
};

export const formatProductDetails = (
  subCategory: string,
  productData: Record<string, any>,
) => {
  const fields = getProductFields(subCategory);
  const formattedDetails: Record<string, string> = {};

  fields.forEach((field) => {
    const value =
      field.key === "location"
        ? typeof productData.locationText === "string" &&
          productData.locationText.trim().length > 0
          ? productData.locationText
          : typeof productData.location === "string"
            ? productData.location
            : ""
        : productData[field.key];
    if (value !== undefined && value !== null && value !== "") {
      formattedDetails[field.key] = String(value);
    }
  });

  return formattedDetails;
};

export const generateMockProduct = (
  id: string,
  mainCategory: string,
  subCategory: string,
): Product => {
  const mockPrice = Math.floor(Math.random() * 100000) + 1000;
  // Note: For address and location, these are simplified mocks.
  // In a real app, you might parse `mockLocationString` or use a geocoding service.
  const mockAddress: Address = {
    province: "Phnom Penh",
    district: "Sen Sok",
    commune: "Phnom Penh Thmey",
  };
  const mockGeoLocation: Location = {
    latitude: 11.562108, // Example coordinate for Phnom Penh
    longitude: 104.891678,
  };
  const mockSellerContact: SellerContact = {
    sellerName: "Sarah Chen",
    phones: ["+85512345678"],
    email: "sarah.chen@example.com",
  };
  const sellerEntitlements = getEntitlements({
    fallbackUserType: "business",
  });

  const baseProduct: Product = {
    id,
    title: `Sample ${subCategory}`,
    description: `This is a great ${subCategory} in excellent condition.`,
    mainCategory,
    subCategory,
    photos: [
      "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800",
      "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800",
      "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800",
    ],
    price: mockPrice.toString(),
    currency: "USD",
    negotiable: true,
    discountType: "none",
    discountValue: "0",
    address: mockAddress,
    location: mockGeoLocation,
    details: {},
    contact: mockSellerContact,
    views: Math.floor(Math.random() * 1000),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
    seller: {
      id: "seller1",
      name: "Sarah Chen",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200",
      verified: sellerEntitlements.hasVerifiedBadge,
      trusted: sellerEntitlements.hasSellerProfileEnhancement,
    },
  };

  const fields = getProductFields(subCategory);

  fields.forEach((field) => {
    if (field.type === "select" && field.options) {
      baseProduct.details[field.key] = field.options[0];
    } else if (field.type === "number") {
      baseProduct.details[field.key] = (Math.floor(Math.random() * 100)).toString();
    } else {
      baseProduct.details[field.key] = `Sample ${field.label}`;
    }
  });

  return baseProduct;
};

// Moved from src/types/productTypes.ts
export const draftToProduct = (draft: ProductDraft, id: string): Product => {
  return {
    id,
    title: draft.title,
    description: draft.description,
    mainCategory: draft.mainCategory,
    subCategory: draft.subCategory,
    photos: draft.photos,
    price: draft.price,
    currency: draft.currency,
    negotiable: draft.negotiable,
    discountType: draft.discountType,
    discountValue: draft.discountValue,
    address: {
      province: draft.province,
      district: draft.district,
      commune: draft.commune,
    },
    location: draft.location,
    details: draft.details,
    contact: draft.contact,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "active",
  };
};

export const formatAddress = (address: Address): string => {
  const parts = [address.province, address.district, address.commune];
  return parts.filter(Boolean).join(", ");
};

export const calculateDiscountPrice = (product: Product): number | null => {
  const basePrice = parseFloat(product.price);
  if (isNaN(basePrice) || product.discountType == "none") {
    return null;
  }
  if (product.discountType === "percentage") {
    const percentage = parseFloat(product.discountValue);
    if (!isNaN(percentage)) {
      return basePrice - (basePrice * percentage) / 100;
    }
  } else if (product.discountType === "fixed") {
    const discount = parseFloat(product.discountValue);
    if (!isNaN(discount)) {
      return basePrice - discount;
    }
  }

  return null;
};

export const formatPrice = (
  price: string | number | null | undefined,
  currency: "USD" | "KHR",
): string => {
  if (price === null || price === undefined) return "";
  const numPrice = typeof price == "string" ? parseFloat(price) : price;
  if (isNaN(numPrice)) return "";
  if (currency == "USD") {
    return `$${numPrice.toLocaleString()}`;
  } else {
    return `៛${numPrice.toLocaleString()}`;
  }
};

export const formatTimeAgo = (dateString: string | null | undefined, t: unknown): string => {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return i18n.t("time_ago.minutes", { count: diffMins });

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return i18n.t("time_ago.hours", { count: diffHours });

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return i18n.t("time_ago.days", { count: diffDays });

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return i18n.t("time_ago.weeks", { count: diffWeeks });

  const diffMonths = Math.floor(diffDays / 30);
  return i18n.t("time_ago.months", { count: diffMonths });
};

export const mapDatabaseProductToProduct = (dbProduct: any): Product => {
  const metadata = dbProduct.metadata || {};
  const rawDiscountValue = String(metadata.discountValue || "").trim();
  const parsedDiscountValue = parseFloat(rawDiscountValue);
  const normalizedDiscountType =
    metadata.discountType === "percentage" || metadata.discountType === "fixed"
      ? metadata.discountType
      : rawDiscountValue.length > 0 &&
          !Number.isNaN(parsedDiscountValue) &&
          parsedDiscountValue > 0
        ? "fixed"
        : "none";

  return {
    id: dbProduct.id,
    title: dbProduct.title,
    description: dbProduct.description,
    mainCategory: metadata.mainCategory || "",
    subCategory: metadata.subCategory || "",
    photos: dbProduct.images || [],
    price: dbProduct.price?.toString() || "0",
    currency: metadata.currency || "USD",
    negotiable: dbProduct.is_negotiable || false,
    discountType: normalizedDiscountType,
    discountValue: rawDiscountValue,
    address: metadata.address || {
      province: dbProduct.location_name,
      district: metadata.district || null,
      commune: metadata.commune || null,
    },
    location: metadata.location || { latitude: 0, longitude: 0 },
    details: metadata.details || {},
    contact: metadata.contact || {
      sellerName: "",
      phones: [],
      email: "",
    },
    views: dbProduct.views || 0,
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
    status: dbProduct.status,
    location_name: dbProduct.location_name,
    seller: dbProduct.seller ? {
      id: dbProduct.seller_id,
      name: `${dbProduct.seller.first_name || ""} ${dbProduct.seller.last_name || ""}`.trim() || "Unknown Seller",
      avatar: dbProduct.seller.avatar_url,
      verified: dbProduct.seller.verified,
      trusted: dbProduct.seller.trusted,
    } : undefined,
  };
};
