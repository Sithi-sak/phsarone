import { ImageQualityMetrics, analyzeImageQuality } from "@src/utils/imageQuality";
import { useCallback, useRef } from "react";

interface BatchAnalysisOptions {
  parallel?: boolean;
  maxConcurrent?: number;
  onProgress?: (progress: {
    analyzed: number;
    total: number;
    percentage: number;
  }) => void;
}

export function useBatchImageAnalysis() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const analyzeBatch = useCallback(
    async (
      imageUris: string[],
      options: BatchAnalysisOptions = {},
    ): Promise<ImageQualityMetrics[]> => {
      const {
        parallel = true,
        maxConcurrent = 3,
        onProgress,
      } = options;

      abortControllerRef.current = new AbortController();
      const results: (ImageQualityMetrics | null)[] = Array(imageUris.length).fill(null);
      let analyzedCount = 0;

      const updateProgress = () => {
        if (onProgress) {
          onProgress({
            analyzed: analyzedCount,
            total: imageUris.length,
            percentage: Math.round((analyzedCount / imageUris.length) * 100),
          });
        }
      };

      if (parallel && maxConcurrent > 1) {
        // Analyze in parallel batches
        for (let i = 0; i < imageUris.length; i += maxConcurrent) {
          if (abortControllerRef.current.signal.aborted) {
            break;
          }

          const batch = imageUris.slice(i, i + maxConcurrent);
          const batchPromises = batch.map((uri, idx) =>
            analyzeImageQuality(uri)
              .then((metrics) => {
                results[i + idx] = metrics;
                analyzedCount++;
                updateProgress();
                return metrics;
              })
              .catch((error) => {
                console.error(`Error analyzing image ${i + idx}:`, error);
                analyzedCount++;
                updateProgress();
                return null;
              }),
          );

          await Promise.all(batchPromises);
        }
      } else {
        // Analyze sequentially
        for (let i = 0; i < imageUris.length; i++) {
          if (abortControllerRef.current.signal.aborted) {
            break;
          }

          try {
            const metrics = await analyzeImageQuality(imageUris[i]);
            results[i] = metrics;
          } catch (error) {
            console.error(`Error analyzing image ${i}:`, error);
          }

          analyzedCount++;
          updateProgress();
        }
      }

      return results.filter((r) => r !== null) as ImageQualityMetrics[];
    },
    [],
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    analyzeBatch,
    abort,
  };
}
