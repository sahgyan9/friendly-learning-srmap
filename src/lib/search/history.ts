import { supabase } from "@/integrations/supabase/client";

const HISTORY_LIMIT = 8;

// search_history and record_search_history are new (migration
// 20260821160000) and not yet in the generated Supabase types — same `as any`
// convention already used for log_search_click in GoogleResultCard.tsx.
// Regenerate types.ts after this migration is applied and these can drop.
const searchHistoryTable = () => (supabase.from("search_history" as any) as any);

export async function getSearchHistory(): Promise<string[]> {
  const { data, error } = await searchHistoryTable()
    .select("query")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error || !data) return [];
  return data.map((row: { query: string }) => row.query);
}

export async function recordSearchHistory(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  await supabase.rpc("record_search_history" as any, { p_query: trimmed });
}

export async function removeSearchHistoryEntry(query: string): Promise<void> {
  await searchHistoryTable().delete().eq("query", query);
}

export async function clearSearchHistory(): Promise<void> {
  await searchHistoryTable().delete().not("id", "is", null);
}
