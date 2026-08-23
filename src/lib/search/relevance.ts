/**
 * One relevance scale for every entity type on /search.
 *
 * Before this module, `relevanceScore` was produced by ~14 separate formulas
 * with incompatible bases — mentors started at 100, faculty at 20, documents
 * at `similarity * 160 + 100`. Those numbers were only ever meaningful *within*
 * one category list, but Search.tsx also uses the best score in each list to
 * decide which section renders first. Comparing them across categories was
 * arithmetic on different units, and it showed: on "machine learning faculty"
 * a mentor at 0.66 similarity scored 165 while the top ML professor scored
 * 152, so Senior Mentors rendered above twelve actual ML researchers.
 *
 * Every producer now emits the same three normalised 0–1 signals and this
 * module combines them, so a score of 40 means the same thing whichever list
 * it came from.
 */

import type { TargetCategory } from "@/lib/search/query-engine";

export type RankedEntityType =
  | "faculty"
  | "mentor"
  | "student"
  | "opportunity"
  | "community"
  | "post"
  | "document"
  | "blog";

/**
 * Normalised match evidence. Every field is 0–1; omitted fields count as 0,
 * which is the correct reading — "this producer found no evidence of that
 * kind", not "unknown".
 */
export interface RelevanceSignals {
  /** Literal agreement between the query and the entity's own text. */
  lexical?: number;
  /** Raw cosine similarity from pgvector, before normalisation. */
  similarity?: number;
  /** Behavioural quality: click-through, engagement, freshness. */
  quality?: number;
}

/**
 * Weights sum to 100 so a final score reads as a percentage of the best
 * possible evidence. Lexical outranks semantic deliberately: an exact name
 * match is a certainty, a 0.7 cosine is a strong guess.
 */
const WEIGHTS = { lexical: 46, semantic: 40, quality: 14 } as const;

/**
 * search_knowledge() already discards everything below 0.35, and in practice
 * this corpus tops out around 0.75 — so raw similarity only ever varies across
 * 40% of its nominal range. Rescaling that band to 0–1 restores the
 * discrimination that a raw multiply throws away: without it, the gap between
 * a perfect topical match and a barely-passing one is a handful of points.
 */
const SIMILARITY_FLOOR = 0.35;
const SIMILARITY_CEILING = 0.75;

export function normaliseSimilarity(similarity: number | undefined): number {
  if (!similarity) return 0;
  return clamp01((similarity - SIMILARITY_FLOOR) / (SIMILARITY_CEILING - SIMILARITY_FLOOR));
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** Which entity types answer the same *kind* of question. */
const PEOPLE: RankedEntityType[] = ["faculty", "mentor", "student"];
const READING: RankedEntityType[] = ["document", "blog", "post"];
const PLACES: RankedEntityType[] = ["opportunity", "community"];

/** The entity type each detected query intent is actually asking for. */
const TARGET_ENTITY: Record<string, RankedEntityType> = {
  mentors: "mentor",
  faculty: "faculty",
  opportunities: "opportunity",
  communities: "community",
  posts: "post",
  blog: "blog",
  documents: "document",
};

/** Full credit for what the query asked for. */
const MULTIPLIER_TARGET = 1;
/** A near-miss — a mentor on a faculty query still plausibly helps. */
const MULTIPLIER_SIBLING = 0.78;
/** A different kind of answer entirely. */
const MULTIPLIER_UNRELATED = 0.55;

/**
 * Intent damps competitors rather than nudging the winner.
 *
 * The old scheme gave faculty +50 for a query containing the word "faculty"
 * while leaving mentors at +60 for merely being mentors — so naming the
 * category you wanted actively cost you 10 points. Worse, it was asymmetric:
 * a mentor query penalised faculty by -40, but a faculty query penalised
 * mentors by nothing at all.
 *
 * Scaling instead of adding fixes both. A demoted result keeps its ordering
 * relative to its own kind (every mentor is scaled identically), so a strong
 * mentor still outranks a weak one and still appears — it just cannot
 * outrank the category the reader actually named.
 */
export function intentMultiplier(
  entityType: RankedEntityType,
  targetCategory?: TargetCategory,
): number {
  if (!targetCategory) return MULTIPLIER_TARGET;

  const wanted = TARGET_ENTITY[targetCategory];
  if (!wanted) return MULTIPLIER_TARGET;
  if (wanted === entityType) return MULTIPLIER_TARGET;

  const sameFamily =
    (PEOPLE.includes(wanted) && PEOPLE.includes(entityType)) ||
    (READING.includes(wanted) && READING.includes(entityType)) ||
    (PLACES.includes(wanted) && PLACES.includes(entityType));

  return sameFamily ? MULTIPLIER_SIBLING : MULTIPLIER_UNRELATED;
}

/**
 * Combine evidence into a single comparable 0–100 score.
 *
 * Ranking uses this for two different jobs — ordering items inside a section,
 * and ordering the sections against each other — and only the shared scale
 * makes the second one valid.
 */
export function scoreResult(
  entityType: RankedEntityType,
  signals: RelevanceSignals,
  targetCategory?: TargetCategory,
): number {
  const lexical = clamp01(signals.lexical ?? 0);
  const semantic = normaliseSimilarity(signals.similarity);
  const quality = clamp01(signals.quality ?? 0);

  const base =
    lexical * WEIGHTS.lexical + semantic * WEIGHTS.semantic + quality * WEIGHTS.quality;

  return base * intentMultiplier(entityType, targetCategory);
}

/**
 * Click-through count → a 0–1 quality signal.
 *
 * Logarithmic so the first few clicks matter and the hundredth does not, and
 * capped so popularity can never outweigh topical fit — 14 points of quality
 * cannot rescue a result with no lexical or semantic evidence behind it.
 */
export function normaliseClicks(clicks: number): number {
  if (!clicks || clicks <= 0) return 0;
  return clamp01(Math.log2(1 + clicks) / 6);
}

/**
 * Faculty are indexed exhaustively — every active profile has a chunk — so a
 * broad query pulls back professors whose only connection is having an
 * embedding at all. On the "All" tab this floor is what keeps the preview
 * honest; the dedicated Faculty tab shows the long tail.
 *
 * On the 0–100 scale that is roughly "one real signal": a semantic-only match
 * at ≈0.5 similarity, or a department match with nothing else.
 */
export const MIN_FACULTY_RELEVANCE = 12;
