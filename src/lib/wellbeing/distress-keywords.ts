/**
 * Curated crisis phrases for deterministic client-side safety detection.
 * Mirrors the server-side distress_keywords database table.
 * Includes English as well as common Hindi and Telugu transliterations.
 */
export const DISTRESS_KEYWORDS = [
  "want to die",
  "commit suicide",
  "kill myself",
  "end my life",
  "ending my life",
  "suicidal",
  "feel like dying",
  "better off dead",
  "no reason to live",
  "cannot live anymore",
  "cant live anymore",
  "cannot take this anymore",
  "cant take this anymore",
  "dont want to wake up",
  "don't want to wake up",
  "self harm",
  "harming myself",
  "hang myself",
  "cut my wrists",
  "overdose",
  "jump off",
  "mar jana chahta",
  "mar jaana chahta",
  "marne ka man",
  "jaan de dunga",
  "zindagi khatam",
  "chhat se kood",
  "aatmahatya",
  "atmahatya",
  "chachipovali",
  "chavali anipistundi",
  "chavali anipisthundi",
  "chavalanipisthundi",
  "chavalanipisthondi",
  "bathakalanipinchadam ledu",
  "praanam theesukunta",
  "athma hathya",
] as const;

/**
 * Checks whether any distress keyword appears in the given text.
 */
export function detectDistressText(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return DISTRESS_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns the first matched distress phrase in the given text, or null if none match.
 */
export function findDistressMatch(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  return DISTRESS_KEYWORDS.find((kw) => lower.includes(kw)) ?? null;
}
