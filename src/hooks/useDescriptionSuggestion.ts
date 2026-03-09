import {
    DescriptionSuggestion,
    generateDescriptionSuggestion,
} from "@src/utils/productFormatter";
import { useMemo } from "react";

/**
 * Custom hook to get description suggestions
 */
export function useDescriptionSuggestion(
  subCategory: string,
  currentDescription: string,
  details: Record<string, any>,
): DescriptionSuggestion {
  const suggestion = useMemo(
    () =>
      generateDescriptionSuggestion(
        subCategory,
        currentDescription,
        details,
      ),
    [subCategory, currentDescription, details],
  );

  return suggestion;
}
