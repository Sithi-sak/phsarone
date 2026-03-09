import {
    ImageQualityMetrics,
    analyzeImageQuality,
    getImageQualityWarning,
} from "@src/utils/imageQuality";
import { useCallback, useEffect, useState } from "react";

export interface ImageAnalysisState {
  [index: number]: ImageQualityMetrics | null;
}

export function useImageQualityAnalysis(imageUris: string[]) {
  const [analysisResults, setAnalysisResults] = useState<ImageAnalysisState>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeImages = useCallback(async (uris: string[]) => {
    setIsAnalyzing(true);
    const results: ImageAnalysisState = {};

    try {
      for (let i = 0; i < uris.length; i++) {
        const metrics = await analyzeImageQuality(uris[i]);
        results[i] = metrics;
      }
      setAnalysisResults(results);
    } catch (error) {
      console.error("Error analyzing images:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    if (imageUris.length > 0) {
      analyzeImages(imageUris);
    }
  }, [imageUris.length, analyzeImages]);

  const getImageWarning = useCallback((index: number): string | null => {
    const metrics = analysisResults[index];
    if (!metrics) return null;
    return getImageQualityWarning(metrics);
  }, [analysisResults]);

  const getAverageQualityScore = useCallback((): number => {
    const scores = Object.values(analysisResults)
      .filter((m) => m !== null)
      .map((m) => m!.qualityScore);

    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [analysisResults]);

  return {
    analysisResults,
    isAnalyzing,
    getImageWarning,
    getAverageQualityScore,
  };
}
