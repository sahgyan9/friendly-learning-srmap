import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Display-only slug for SERP breadcrumbs — not a routing identifier.
 * Collapses to a short fallback when the source text has no usable characters
 * (e.g. emoji-only titles), so breadcrumbs never render as a bare "›".
 */
export function slugify(text: string, maxWords = 6): string {
  const slug = (text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, maxWords)
    .join("-");
  return slug || "item";
}
