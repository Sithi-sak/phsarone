import { useCallback, useState } from "react";

export type ImageType =
  | "front"
  | "back"
  | "closeup"
  | "packaging"
  | "damage"
  | "other";

export interface ImageSuggestion {
  type: ImageType;
  label: string;
  description: string;
  isUploaded: boolean;
}

export interface ImageQualityWarning {
  imageIndex: number;
  message: string;
  severity: "warning" | "info";
}

export interface ImageAnalysisResult {
  suggestions: ImageSuggestion[];
  warnings: ImageQualityWarning[];
  completionPercentage: number;
  recommendedImageCount: number;
  currentImageCount: number;
  missingImageTypes: ImageSuggestion[];
}

const IMAGE_SUGGESTIONS: Record<ImageType, Omit<ImageSuggestion, "isUploaded">> =
  {
    front: {
      type: "front",
      label: "Front View",
      description: "Clear frontal view of the product",
    },
    back: {
      type: "back",
      label: "Back View",
      description: "Back or side view showing different angles",
    },
    closeup: {
      type: "closeup",
      label: "Close-up",
      description: "Detailed close-up showing condition and details",
    },
    packaging: {
      type: "packaging",
      label: "Packaging",
      description: "Original packaging or if applicable",
    },
    damage: {
      type: "damage",
      label: "Damage/Condition",
      description: "Any visible damage, wear, or defects (if applicable)",
    },
    other: {
      type: "other",
      label: "Additional Views",
      description: "Any other helpful angles or details",
    },
  };

export function useImageSuggestions(uploadedImageCount: number = 0) {
  const [uploadedTypes, setUploadedTypes] = useState<ImageType[]>([]);

  const analyzeImages = useCallback(
    (imageCount: number): ImageAnalysisResult => {
      const recommendedCount = 3;
      const completionPercentage = Math.min(
        (imageCount / recommendedCount) * 100,
        100,
      );

      const suggestions = Object.values(IMAGE_SUGGESTIONS).map((sugg) => ({
        ...sugg,
        isUploaded: uploadedTypes.includes(sugg.type),
      }));

      const warnings: ImageQualityWarning[] = [];

      // Warn if too few images
      if (imageCount === 1) {
        warnings.push({
          imageIndex: 0,
          message: "Add at least 3 photos: front, back, and close-up of the product.",
          severity: "info",
        });
      }

      if (imageCount === 2) {
        warnings.push({
          imageIndex: 1,
          message: "Add one more photo (close-up or detail view recommended).",
          severity: "info",
        });
      }

      const missingImageTypes = suggestions.filter((s) => !s.isUploaded);

      return {
        suggestions,
        warnings,
        completionPercentage,
        recommendedImageCount: recommendedCount,
        currentImageCount: imageCount,
        missingImageTypes,
      };
    },
    [uploadedTypes],
  );

  const markImageType = useCallback((type: ImageType) => {
    setUploadedTypes((prev) => {
      if (!prev.includes(type)) {
        return [...prev, type];
      }
      return prev;
    });
  }, []);

  const clearImageTypes = useCallback(() => {
    setUploadedTypes([]);
  }, []);

  const resetImageType = useCallback((type: ImageType) => {
    setUploadedTypes((prev) => prev.filter((t) => t !== type));
  }, []);

  const analysis = analyzeImages(uploadedImageCount);

  return {
    analysis,
    markImageType,
    clearImageTypes,
    resetImageType,
    uploadedTypes,
  };
}
