import { supabase } from "@/integrations/supabase/client";

/**
 * Something the search matched: a person, a thing to enter, a group or a
 * thread. `metadata` differs by kind — faculty carry `slug` and `interests`,
 * mentors carry `skills`, groups carry `kind` and `member_count` — so each is
 * narrowed separately at the point of rendering rather than forced into one
 * shape that fits none of them.
 */
export type AskResult = {
  entity_type: "faculty" | "mentor" | "student" | "opportunity" | "community" | "post";
  entity_id: string;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
  source_path: string;
  /** Cosine similarity, 0-1. Below 0.30 is filtered out server-side. */
  similarity: number;
};

export type AskResponse = {
  query: string;
  cached: boolean;
  total: number;
  faculty: AskResult[];
  mentors: AskResult[];
  /**
   * Optional until the backend ships it. Same row shape as `mentors`, with
   * `entity_type: "student"`. Absent (not an empty array) on any deployed
   * function that predates this field — every reader must treat `undefined`
   * as "no students group" rather than crash on it.
   */
  students?: AskResult[];
  opportunities: AskResult[];
  communities: AskResult[];
  posts: AskResult[];
  /** Entity types the server has no group for yet. Never silently dropped. */
  other: AskResult[];
};

/**
 * Every group in an AskResponse, flattened and re-sorted by score.
 *
 * The server groups by type so a caller can say "no faculty but three
 * mentors"; a caller that wants one ranked list has to undo that, and doing it
 * here means a new entity type is picked up without touching the callers.
 * `other` is included deliberately — that field exists so a type the server has
 * no group for yet degrades to visible-but-ungrouped instead of vanishing, and
 * dropping it here would reintroduce exactly the silent loss it prevents.
 */
export function allResults(data: AskResponse): AskResult[] {
  return [
    ...data.faculty,
    ...data.mentors,
    ...(data.students ?? []),
    ...data.opportunities,
    ...(data.communities ?? []),
    ...(data.posts ?? []),
    ...(data.other ?? []),
  ].sort((a, b) => b.similarity - a.similarity);
}

/** Reads a metadata field without spraying casts through the components. */
export function metaString(result: AskResult, key: string): string | null {
  const value = result.metadata?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function metaList(result: AskResult, key: string): string[] {
  const value = result.metadata?.[key];
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * Ask a question in plain language and get faculty *and* seniors back together.
 *
 * The matching happens as a vector lookup in Postgres, not by asking a model to
 * choose people, so a result always corresponds to a row that exists. The edge
 * function embeds the question and does the retrieval; nothing here needs an
 * API key.
 */
export async function askWhoCanHelp(query: string, limit = 12, types?: AskResult["entity_type"][]) {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return { data: null, error: new Error("Type at least 3 characters") };
  }

  const body: { query: string; limit: number; types?: string[] } = { query: trimmed, limit };
  if (types && types.length > 0) body.types = types;

  const { data, error } = await supabase.functions.invoke<AskResponse>("semantic-search", {
    body,
  });

  if (error) {
    console.error("Semantic search failed:", error);
    // The function distinguishes "busy" from "broken"; surface that difference
    // rather than telling a student to try again when it will not help.
    const message =
      (error as { context?: { status?: number } })?.context?.status === 429
        ? "Search is busy right now — try again in a minute."
        : "Search failed. Please try again.";
    return { data: null, error: new Error(message) };
  }

  return { data: data ?? null, error: null };
}
