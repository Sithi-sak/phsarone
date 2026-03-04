import i18n from "../i18n";
export interface SellerContact {
  sellerName: string;
  phones: string[];
  email: string;
}
export interface Location {
  latitude: number;
  longitude: number;
}
export interface Address {
  province: string | null;
  district: string | null;
  commune: string | null;
}
export interface Product {
  id: string;
  title: string;
  description: string;
  mainCategory: string;
  subCategory: string;
  photos: string[];
  price: string;
  currency: "USD" | "KHR";
  negotiable: boolean;
  discountType: "none" | "percentage" | "fixed";
  discountValue: string;
  location_name?: string | null; // Added for Supabase sync
  address: Address;
  location: Location;
  details: Record<string, any>;
  contact: SellerContact;
  views?: number;
  createdAt: string;
  updatedAt: string;
  status: "active" | "sold" | "interactive" | "expired" | "draft" | "hidden";
  seller?: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
    trusted?: boolean;
    rating?: number;
    totalListings?: number;
  };
}

export interface ProductDraft {
  title: string;
  description: string;
  mainCategory: string;
  subCategory: string;
  photos: string[];
  price: string;
  currency: "USD" | "KHR";
  negotiable: boolean;
  discountType: "none" | "percentage" | "fixed";
  discountValue: string;
  province: string | null;
  district: string | null;
  commune: string | null;
  location: Location;
  details: Record<string, any>;
  contact: SellerContact;
}

export interface TradeItemPreference {
  name: string;
  description?: string;
}

export interface TradeProductDetail {
  id: string;
  images: string[];
  title: string;
  description: string;
  condition: string;
  originalPrice: number;
  telephone: string;
  province: string | null;
  district: string | null;
  commune: string | null;
  coordinates: Location;
  lookingFor: TradeItemPreference[];
  estimatedTradeValueRange: string;
  owner: {
    name: string;
    isVerified: boolean;
    avatar: string;
  };
  postedDate: string;
}

export interface TradeProduct {
  id: string;
  images: string[];
  title: string;
  seller: string;
  timeAgo: {
    value: number;
    unit: "minutes" | "hours" | "days" | "weeks" | "months";
  };
  owner_id?: string;
  status?: string;
  lookingFor: Array<{
    name: string;
    description?: string;
  }>;
  condition: string;
  originalPrice?: number;
  province: string;
  district: string;
  commune?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  telephone?: string;
  estimatedTradeValueRange?: string;
  owner?: {
    name: string;
    isVerified: boolean;
    avatar: string;
  };
  postedDate?: string;
}

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
