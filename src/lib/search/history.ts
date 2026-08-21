import { supabase } from "@/integrations/supabase/client";

const HISTORY_LIMIT = 8;

export interface SearchHistoryEntry {
  query: string;
  resultUrl: string | null;
}

// search_history and record_search_history are new (migrations
// 20260821160000, 20260821170000) and not yet in the generated Supabase
// types — same `as any` convention already used for log_search_click in
// GoogleResultCard.tsx. Regenerate types.ts after these apply and these can
// drop.
const searchHistoryTable = () => (supabase.from("search_history" as any) as any);

export async function getSearchHistory(): Promise<SearchHistoryEntry[]> {
  const { data, error } = await searchHistoryTable()
    .select("query, result_url")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) return [];
  return data.map((row: { query: string; result_url: string | null }) => ({
    query: row.query,
    resultUrl: row.result_url,
  }));
}

// resultUrl is the specific page this query actually took the user to (e.g.
// a "Pages & Quick Links" match like /admin). Omit it for a plain full-text
// search, which replays to the generic /search results page instead.
export async function recordSearchHistory(query: string, resultUrl?: string | null): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  await supabase.rpc("record_search_history" as any, {
    p_query: trimmed,
    p_result_url: resultUrl ?? null,
  });
}

export async function removeSearchHistoryEntry(query: string): Promise<void> {
  await searchHistoryTable().delete().eq("query", query);
}

export async function clearSearchHistory(): Promise<void> {
  await searchHistoryTable().delete().not("id", "is", null);
}
