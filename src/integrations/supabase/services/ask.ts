import { supabase } from "@/integrations/supabase/client";

/**
 * A person the search matched, faculty or mentor. `metadata` differs by kind —
 * faculty carry `slug` and `interests`, mentors carry `skills` — so the two are
 * narrowed separately at the point of rendering rather than forced into one
 * shape that fits neither.
 */
export type AskResult = {
  entity_type: "faculty" | "mentor";
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
};

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
export async function askWhoCanHelp(query: string, limit = 12) {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return { data: null, error: new Error("Type at least 3 characters") };
  }

  const { data, error } = await supabase.functions.invoke<AskResponse>("semantic-search", {
    body: { query: trimmed, limit },
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
