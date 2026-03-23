import { Platform } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";

const DEFAULT_AI_API_URL =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";
const MODERATION_MAX_DIMENSION = 512;
const MODERATION_COMPRESS_QUALITY = 0.58;

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

async function prepareImageForModeration(uri: string): Promise<string> {
  const imageRef = await ImageManipulator.ImageManipulator.manipulate(uri);
  const image = await imageRef.renderAsync();

  const width = image.width ?? 0;
  const height = image.height ?? 0;
  const shouldResize =
    width > MODERATION_MAX_DIMENSION || height > MODERATION_MAX_DIMENSION;

  const finalImage = shouldResize
    ? await imageRef
        .resize(
          width >= height
            ? { width: MODERATION_MAX_DIMENSION }
            : { height: MODERATION_MAX_DIMENSION },
        )
        .renderAsync()
    : image;

  const result = await finalImage.saveAsync({
    compress: MODERATION_COMPRESS_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  const preparedUri =
    (result as { localUri?: string; uri?: string }).localUri ?? result.uri;

  if (!preparedUri) {
    throw new Error("Image moderation preparation did not return a file URI.");
  }

  return preparedUri;
}

export async function moderateImageAsset(uri: string): Promise<ImageModerationResult> {
  const moderationUri = await prepareImageForModeration(uri);
  const formData = new FormData();
  formData.append("file", {
    uri: moderationUri,
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
