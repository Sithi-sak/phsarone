import { Platform } from "react-native";

const DEFAULT_AI_API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_AI_SEARCH_API_URL || DEFAULT_AI_API_URL;
}

export type ImageModerationResult = {
  decision: "allow" | "review" | "block";
  reasons: string[];
  scores: Record<string, number>;
};

export function isImageModerationServiceFailure(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return (
    message.includes("Application failed to respond") ||
    message.includes("502") ||
    message.includes("500") ||
    message.includes("Network request failed") ||
    message.includes("timed out") ||
    message.includes("out of memory")
  );
}

export function shouldBlockImageModeration(
  moderation: ImageModerationResult,
): boolean {
  if (moderation.decision === "block") return true;

  return moderation.reasons.some((reason) =>
    ["dangerous item", "possible dangerous item", "adult content"].includes(
      reason,
    ),
  );
}

export async function moderateImageAsset(uri: string): Promise<ImageModerationResult> {
  const formData = new FormData();
  formData.append("file", {
    uri,
    name: "listing-photo.jpg",
    type: "image/jpeg",
  } as any);

  const response = await fetch(`${getApiBaseUrl()}/moderate-image`, {
    method: "POST",
    body: formData,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Image moderation failed with ${response.status}`);
  }

  return response.json() as Promise<ImageModerationResult>;
}
