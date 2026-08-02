/**
 * Shrinks an image in the browser before it is uploaded.
 *
 * Phones take enormous pictures. A real profile photo in this database is
 * 3024x4032 — twelve megapixels, several megabytes — and it is downloaded in
 * full to paint a 28x28 avatar in a post byline. Post images are allowed up to
 * 5MB and were uploaded untouched. On campus wifi that is a slow feed, and it is
 * storage and egress that gets paid for twice: once to put it there, and again
 * every time anyone scrolls past it.
 *
 * Resizing here rather than in a server function or a storage transform keeps
 * the big file on the phone that made it. It never crosses the network at all.
 *
 * The whole thing is best-effort by design. Every failure path returns the
 * original file, because a photo that uploads slightly too large beats a photo
 * that does not upload.
 */

export interface DownscaleOptions {
  /** Longest edge, in pixels, after shrinking. */
  maxEdge?: number;
  /** JPEG/WebP quality, 0–1. Above ~0.85 the file grows for no visible gain. */
  quality?: number;
}

/**
 * 1600px is about twice the widest an image is ever displayed here (the post
 * column caps at 512 CSS px), which leaves headroom for retina screens and for
 * someone opening the file directly.
 */
const DEFAULT_MAX_EDGE = 1600;
const DEFAULT_QUALITY = 0.82;

/** Below this, shrinking costs more than it saves. */
const SKIP_UNDER_BYTES = 200 * 1024;

/**
 * Formats to hand back untouched.
 *
 * GIF because drawing one to a canvas keeps the first frame and silently throws
 * the animation away, and SVG because it is already tiny and rasterising it
 * would be a downgrade in every dimension.
 */
const PASS_THROUGH = new Set(["image/gif", "image/svg+xml"]);

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function downscaleImage(file: File, options: DownscaleOptions = {}): Promise<File> {
  const { maxEdge = DEFAULT_MAX_EDGE, quality = DEFAULT_QUALITY } = options;

  if (!file.type.startsWith("image/")) return file;
  if (PASS_THROUGH.has(file.type)) return file;
  if (file.size <= SKIP_UNDER_BYTES) return file;
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    // `from-image` applies the EXIF rotation flag. Without it, photos taken in
    // portrait on a phone arrive on their side — the camera records the
    // orientation as metadata rather than rotating the pixels, and a canvas
    // reads the pixels. This also normalises it permanently, so nothing
    // downstream has to know about EXIF.
    //
    // Formats the browser cannot decode land here too: Safari writes HEIC by
    // default and no browser can draw it, so this throws and the original is
    // returned. Supabase stores it either way.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const { width, height } = bitmap;
    const scale = Math.min(1, maxEdge / Math.max(width, height));

    // Already small enough. Re-encoding would only lose quality.
    if (scale === 1) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // PNG stays PNG: it is the format people use for screenshots and for
    // anything with a transparent background, and JPEG would flatten that
    // transparency to black. The size win comes from the smaller dimensions
    // rather than from the encoder.
    const keepPng = file.type === "image/png";
    const outputType = keepPng ? "image/png" : "image/jpeg";

    const blob = await canvasToBlob(canvas, outputType, quality);
    if (!blob) return file;

    // A small, already-optimised image can come out of the encoder larger than
    // it went in. Handing back something bigger would be the opposite of the
    // point.
    if (blob.size >= file.size) return file;

    const extension = keepPng ? "png" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";

    return new File([blob], `${base}.${extension}`, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}

/** Human-readable size, for telling someone what the shrink actually saved. */
export const formatBytes = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;
