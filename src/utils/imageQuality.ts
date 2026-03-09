import * as FileSystem from "expo-file-system/legacy";
import { Image } from "react-native";

export interface ImageQualityMetrics {
  fileName: string;
  fileSize: number; // in bytes
  dimensions: {
    width: number;
    height: number;
  };
  isLowResolution: boolean;
  isHighFileSize: boolean;
  qualityScore: number; // 0-100
  recommendations: string[];
  issues: {
    resolution?: string;
    fileSize?: string;
    aspectRatio?: string;
  };
  priority: "high" | "medium" | "low";
  scoreBreakdown: {
    resolution: number;
    fileSize: number;
    aspectRatio: number;
  };
}

const MIN_RECOMMENDED_WIDTH = 800;
const MIN_RECOMMENDED_HEIGHT = 600;
const OPTIMAL_MIN_WIDTH = 1200;
const OPTIMAL_MIN_HEIGHT = 900;
const MAX_RECOMMENDED_FILE_SIZE = 5242880; // 5MB
const IDEAL_MAX_FILE_SIZE = 2097152; // 2MB
const IDEAL_ASPECT_RATIO = { min: 0.7, max: 1.43 }; // 3:4 to 4:3

export async function analyzeImageQuality(
  imageUri: string,
): Promise<ImageQualityMetrics> {
  const recommendations: string[] = [];
  const issues: ImageQualityMetrics["issues"] = {};
  const scoreBreakdown = { resolution: 0, fileSize: 0, aspectRatio: 0 };
  let qualityScore = 100;

  try {
    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    const fileSize = (fileInfo as any).size || 0;

    // Get image dimensions
    const dimensions = await new Promise<{
      width: number;
      height: number;
    }>((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => {
          resolve({ width, height });
        },
        (error) => {
          reject(error);
        },
      );
    });

    // Check for low resolution
    const isLowResolution =
      dimensions.width < MIN_RECOMMENDED_WIDTH ||
      dimensions.height < MIN_RECOMMENDED_HEIGHT;

    if (isLowResolution) {
      issues.resolution = `Low resolution (${dimensions.width}x${dimensions.height})`;
      recommendations.push(`📐 Increase image resolution to at least ${MIN_RECOMMENDED_WIDTH}x${MIN_RECOMMENDED_HEIGHT}`);
      scoreBreakdown.resolution = -20;
      qualityScore -= 20;
    } else if (
      dimensions.width < OPTIMAL_MIN_WIDTH ||
      dimensions.height < OPTIMAL_MIN_HEIGHT
    ) {
      recommendations.push(
        `💡 Consider using a higher resolution (${OPTIMAL_MIN_WIDTH}x${OPTIMAL_MIN_HEIGHT}+) for better quality`,
      );
      scoreBreakdown.resolution = -8;
      qualityScore -= 8;
    } else {
      scoreBreakdown.resolution = 0;
    }

    // Check for high file size
    const isHighFileSize = fileSize > MAX_RECOMMENDED_FILE_SIZE;

    if (isHighFileSize) {
      issues.fileSize = `File too large (${(fileSize / 1024 / 1024).toFixed(2)}MB)`;
      recommendations.push(`📦 Compress image to reduce file size (currently ${(fileSize / 1024 / 1024).toFixed(2)}MB)`);
      scoreBreakdown.fileSize = -15;
      qualityScore -= 15;
    } else if (fileSize > IDEAL_MAX_FILE_SIZE) {
      recommendations.push(`💡 Compress to under 2MB for faster uploads`);
      scoreBreakdown.fileSize = -5;
      qualityScore -= 5;
    } else {
      scoreBreakdown.fileSize = 0;
    }

    // Aspect ratio check
    const aspectRatio = dimensions.width / dimensions.height;
    if (aspectRatio < 0.5 || aspectRatio > 2) {
      issues.aspectRatio = `Extreme aspect ratio (${aspectRatio.toFixed(2)})`;
      recommendations.push(`📐 Aspect ratio is extreme - consider a more balanced crop`);
      scoreBreakdown.aspectRatio = -10;
      qualityScore -= 10;
    } else if (
      aspectRatio < IDEAL_ASPECT_RATIO.min ||
      aspectRatio > IDEAL_ASPECT_RATIO.max
    ) {
      recommendations.push(`💡 Portrait or landscape orientation - consider adjusting for better presentation`);
      scoreBreakdown.aspectRatio = -5;
      qualityScore -= 5;
    } else {
      scoreBreakdown.aspectRatio = 0;
    }

    // Determine priority
    const hasHighPriority = qualityScore < 60;
    const hasMediumPriority = qualityScore < 80;
    const priority: "high" | "medium" | "low" = hasHighPriority
      ? "high"
      : hasMediumPriority
        ? "medium"
        : "low";

    return {
      fileName: imageUri.split("/").pop() || "image.jpg",
      fileSize,
      dimensions,
      isLowResolution,
      isHighFileSize,
      qualityScore: Math.max(0, qualityScore),
      recommendations,
      issues,
      priority,
      scoreBreakdown,
    };
  } catch (error) {
    console.error("Error analyzing image quality:", error);
    // Return default metrics if analysis fails
    return {
      fileName: imageUri.split("/").pop() || "image.jpg",
      fileSize: 0,
      dimensions: { width: 0, height: 0 },
      isLowResolution: false,
      isHighFileSize: false,
      qualityScore: 50,
      recommendations: ["Unable to analyze image quality"],
      issues: {},
      priority: "high",
      scoreBreakdown: { resolution: -20, fileSize: -15, aspectRatio: -15 },
    };
  }
}

export function getImageQualityWarning(
  metrics: ImageQualityMetrics,
): string | null {
  if (metrics.isLowResolution) {
    return `Low resolution: ${metrics.dimensions.width}x${metrics.dimensions.height}. Use at least ${MIN_RECOMMENDED_WIDTH}x${MIN_RECOMMENDED_HEIGHT}`;
  }

  if (metrics.isHighFileSize) {
    return `File size too large (${(metrics.fileSize / 1024 / 1024).toFixed(2)}MB). Compress to under 5MB`;
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}
