import * as ImageManipulator from "expo-image-manipulator";

const DEFAULT_MAX_DIMENSION = 1280;
const DEFAULT_COMPRESS_QUALITY = 0.72;

type NormalizeOptions = {
  compress?: number;
  maxDimension?: number;
};

export async function normalizeImageForUpload(
  uri: string,
  options?: NormalizeOptions,
): Promise<string> {
  const maxDimension = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const compress = options?.compress ?? DEFAULT_COMPRESS_QUALITY;

  const imageRef = await ImageManipulator.ImageManipulator.manipulate(uri);
  const image = await imageRef.renderAsync();

  const width = image.width ?? 0;
  const height = image.height ?? 0;
  const shouldResize = width > maxDimension || height > maxDimension;

  if (!shouldResize) {
    const result = await image.saveAsync({
      compress,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const normalizedUri =
      (result as { localUri?: string; uri?: string }).localUri ?? result.uri;
    if (!normalizedUri) {
      throw new Error("Image normalization did not return a file URI.");
    }
    return normalizedUri;
  }

  const resizedRef = imageRef.resize(
    width >= height ? { width: maxDimension } : { height: maxDimension },
  );
  const resizedImage = await resizedRef.renderAsync();
  const result = await resizedImage.saveAsync({
    compress,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const normalizedUri =
    (result as { localUri?: string; uri?: string }).localUri ?? result.uri;
  if (!normalizedUri) {
    throw new Error("Image normalization did not return a file URI.");
  }
  return normalizedUri;
}
