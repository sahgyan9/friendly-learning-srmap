import type { SearchDestination } from "./destinations";

/**
 * Scoring for the static destination list.
 *
 * cmdk ships its own fuzzy filter, but it is switched off here: results from
 * the database arrive already filtered by the server, and running them through
 * a second client-side filter would hide rows the query had genuinely matched
 * (a mentor called "Anjali" disappearing from a search for "anjali sharma", say).
 * With filtering off for one kind of result it has to be off for all of them,
 * so the static list is scored here instead.
 *
 * The scale is deliberately coarse and readable. What matters is the order of
 * the tiers, not the exact numbers: an exact label beats a label prefix beats
 * an alias beats a loose subsequence.
 */

const EXACT_LABEL = 120;
const LABEL_PREFIX = 100;
const EXACT_KEYWORD = 95;
const KEYWORD_PREFIX = 80;
const LABEL_WORD_PREFIX = 75;
const LABEL_CONTAINS = 60;
const KEYWORD_CONTAINS = 50;
const HINT_CONTAINS = 25;
const SUBSEQUENCE = 10;

/** Lowercased, punctuation-free, single-spaced. "Sign-In!" -> "sign in". */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True if every character of `query` appears in `text`, in order. */
function isSubsequence(query: string, text: string): boolean {
  let index = 0;
  for (const char of text) {
    if (char === query[index]) index += 1;
    if (index === query.length) return true;
  }
  return query.length === 0;
}

/** True if any word in `text` starts with `query` — so "mode" matches "dark mode". */
function hasWordStartingWith(text: string, query: string): boolean {
  return text.split(" ").some((word) => word.startsWith(query));
}

export function scoreDestination(destination: SearchDestination, rawQuery: string): number {
  const query = normalise(rawQuery);
  if (!query) return 0;

  const label = normalise(destination.label);

  if (label === query) return EXACT_LABEL;
  if (label.startsWith(query)) return LABEL_PREFIX;

  let best = 0;

  for (const keyword of destination.keywords) {
    const value = normalise(keyword);
    if (value === query) return EXACT_KEYWORD;
    if (value.startsWith(query)) best = Math.max(best, KEYWORD_PREFIX);
    else if (hasWordStartingWith(value, query)) best = Math.max(best, KEYWORD_PREFIX - 5);
    else if (value.includes(query)) best = Math.max(best, KEYWORD_CONTAINS);
  }

  if (hasWordStartingWith(label, query)) best = Math.max(best, LABEL_WORD_PREFIX);
  else if (label.includes(query)) best = Math.max(best, LABEL_CONTAINS);

  if (best === 0 && normalise(destination.hint).includes(query)) {
    best = HINT_CONTAINS;
  }

  // Last resort, and only for queries long enough that a loose match means
  // something. Two characters would match almost everything.
  if (best === 0 && query.length >= 3 && isSubsequence(query.replace(/\s/g, ""), label)) {
    best = SUBSEQUENCE;
  }

  return best;
}

export interface RankedDestination {
  destination: SearchDestination;
  score: number;
}

export function rankDestinations(
  destinations: SearchDestination[],
  query: string,
  limit = 8,
): RankedDestination[] {
  return destinations
    .map((destination) => ({ destination, score: scoreDestination(destination, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.destination.label.localeCompare(b.destination.label))
    .slice(0, limit);
}
