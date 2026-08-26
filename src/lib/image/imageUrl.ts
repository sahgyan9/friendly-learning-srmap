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

  // Return base64, blob, relative paths, or already-proxied wsrv/svg assets as-is
  if (
    url.startsWith("data:") ||
    url.startsWith("blob:") ||
    url.startsWith("/") ||
    url.startsWith("https://wsrv.nl") ||
    url.startsWith("//wsrv.nl") ||
    url.endsWith(".svg") ||
    url.includes(".svg?")
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
