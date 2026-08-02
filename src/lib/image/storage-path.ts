/**
 * Recovers the object path from a Supabase Storage public URL, or null if the
 * URL isn't one of ours — a pasted external link, a data: URL, an
 * AI-generated image pasted in from elsewhere. Callers use this to decide
 * whether a stored URL is safe to hand to `storage.remove()`; anything that
 * doesn't match the bucket is left alone rather than risk deleting nothing
 * (or, worse, mis-parsing someone else's URL into a path in our bucket).
 */
export function storagePathFromPublicUrl(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  const path = url.slice(index + marker.length);
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
