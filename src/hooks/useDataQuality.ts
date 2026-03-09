import {
    validateDataQuality
} from "@src/utils/productFormatter";
import { useMemo } from "react";

/**
 * Custom hook to get data quality validation results
 */
export function useDataQuality(
  subCategory: string,
  details: Record<string, any>,
) {
  const issues = useMemo(
    () => validateDataQuality(subCategory, details),
    [subCategory, details],
  );

  const hasErrors = useMemo(
    () => issues.some((i) => i.severity === "error"),
    [issues],
  );

  const hasWarnings = useMemo(
    () => issues.some((i) => i.severity === "warning"),
    [issues],
  );

  const errorCount = useMemo(
    () => issues.filter((i) => i.severity === "error").length,
    [issues],
  );

  const warningCount = useMemo(
    () => issues.filter((i) => i.severity === "warning").length,
    [issues],
  );

  return {
    issues,
    hasErrors,
    hasWarnings,
    errorCount,
    warningCount,
    isEmpty: issues.length === 0,
  };
}
