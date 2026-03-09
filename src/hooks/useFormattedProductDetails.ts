import { POST_FIELDS_MAP } from "@src/constants/postFields";
import {
    formatProductDetails,
    getProductDetailsSummary,
    validateProductDetails,
} from "@src/utils/productFormatter";
import { useMemo } from "react";

/**
 * Custom hook to get formatted product details and validation
 */
export function useFormattedProductDetails(
  subCategory: string,
  details: Record<string, any>,
) {
  const formatted = useMemo(
    () => formatProductDetails(subCategory, details),
    [subCategory, details],
  );

  const summary = useMemo(
    () => getProductDetailsSummary(subCategory, details),
    [subCategory, details],
  );

  const validation = useMemo(
    () => validateProductDetails(subCategory, details),
    [subCategory, details],
  );

  const totalFields = POST_FIELDS_MAP[subCategory]?.length || 0;
  const filledFields = formatted.length;
  const completionPercentage =
    totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return {
    formatted,
    summary,
    validation,
    totalFields,
    filledFields,
    completionPercentage,
  };
}
