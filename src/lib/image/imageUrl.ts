/**
 * Image optimization helper using wsrv.nl CDN proxy for responsive WebP images.
 */
export interface ImageOptimizationOptions {
  width?: number | string;
  height?: number | string;
  quality?: number | string;
  fit?: "cover" | "contain" | "inside" | "outside";
  format?: "webp" | "auto" | "png" | "jpg";
}

export function getOptimizedImageUrl(
  url: string | null | undefined,
  optionsOrWidth: ImageOptimizationOptions | number | string = {},
): string {
  if (!url) return "";

  // Return base64, blob, relative paths, or already-optimized Supabase Storage WebP assets as-is
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("/") ||
    (url.includes("supabase.co/storage/") && url.endsWith(".webp"))
  ) {
    return url;
  }

  const options: ImageOptimizationOptions =
    typeof optionsOrWidth === "string" || typeof optionsOrWidth === "number"
      ? { width: optionsOrWidth }
      : optionsOrWidth;

  const {
    width = "1280",
    height,
    quality = "85",
    fit = "cover",
    format = "webp",
  } = options;

  const params = new URLSearchParams({
    url,
    w: String(width),
    q: String(quality),
    output: format,
    fit,
  });

  if (height) {
    params.set("h", String(height));
  }

  return `https://wsrv.nl/?${params.toString()}`;
}
