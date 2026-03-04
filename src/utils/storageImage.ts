export type StorageImagePreset = "card" | "thumb" | "detail" | "chat";

type PresetOptions = {
  width: number;
  height?: number;
  resize: "cover" | "contain" | "fill";
  quality: number;
};

const PRESET_OPTIONS: Record<StorageImagePreset, PresetOptions> = {
  card: { width: 400, height: 300, resize: "cover", quality: 60 },
  thumb: { width: 120, height: 120, resize: "cover", quality: 60 },
  detail: { width: 1080, resize: "contain", quality: 70 },
  chat: { width: 900, resize: "cover", quality: 70 },
};

const PUBLIC_OBJECT_PREFIX = "/storage/v1/object/public/";
const PUBLIC_RENDER_PREFIX = "/storage/v1/render/image/public/";
const ENABLE_IMAGE_TRANSFORM =
  process.env.EXPO_PUBLIC_SUPABASE_IMAGE_TRANSFORM === "true";

function extractStoragePath(pathname: string): string | null {
  const objectIndex = pathname.indexOf(PUBLIC_OBJECT_PREFIX);
  if (objectIndex !== -1) {
    return pathname.slice(objectIndex + PUBLIC_OBJECT_PREFIX.length);
  }

  const renderIndex = pathname.indexOf(PUBLIC_RENDER_PREFIX);
  if (renderIndex !== -1) {
    return pathname.slice(renderIndex + PUBLIC_RENDER_PREFIX.length);
  }

  return null;
}

export function getOptimizedStorageImageUrl(
  url: string,
  preset: StorageImagePreset,
): string {
  if (!url) return url;
  if (!ENABLE_IMAGE_TRANSFORM) return url;

  try {
    const parsedUrl = new URL(url);
    const storagePath = extractStoragePath(parsedUrl.pathname);
    if (!storagePath) return url;

    const cleanStoragePath = storagePath.replace(/^\/+/, "");
    if (!cleanStoragePath) return url;

    const options = PRESET_OPTIONS[preset];
    parsedUrl.pathname = `${PUBLIC_RENDER_PREFIX}${cleanStoragePath}`;
    parsedUrl.searchParams.set("width", String(options.width));
    parsedUrl.searchParams.set("resize", options.resize);
    parsedUrl.searchParams.set("quality", String(options.quality));

    if (typeof options.height === "number") {
      parsedUrl.searchParams.set("height", String(options.height));
    } else {
      parsedUrl.searchParams.delete("height");
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
}
