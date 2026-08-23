import { supabase } from "@/integrations/supabase/client";
import { DESTINATIONS } from "@/lib/search/destinations";

export interface TrendingSearch {
  query: string;
  count: number;
}

// Below this many real trending queries, a curated fallback list reads better
// than a sparse "trending" row — a fresh install (or a quiet week) shouldn't
// make trending UI look empty or single-item.
export const MIN_TRENDING_TO_SHOW = 4;

// search_query_cache logs every keystroke-driven lookup the command palette
// runs, including someone typing "admin" or "faculty" purely to jump to that
// page — real usage, but not a "search" a visitor should see suggested back
// to them as a trend. Only an *exact* match is excluded (a whole-query "admin"
// vs. content like "machine learning faculty", which stays) since a partial
// filter would wrongly swallow real searches that happen to share a word with
// a page name.
const NAVIGATION_TERMS = new Set(
  DESTINATIONS.flatMap((d) => [d.id, d.label, ...d.keywords]).map((s) => s.toLowerCase()),
);

function isNavigationQuery(query: string): boolean {
  return NAVIGATION_TERMS.has(query.trim().toLowerCase());
}

// get_trending_searches is new (migration 20260823090000) and not yet in the
// generated Supabase types — same `as any` convention used for
// record_search_history in history.ts. Regenerate types.ts after this applies
// and the casts here can drop.
export async function getTrendingSearches(limit = 6): Promise<TrendingSearch[]> {
  // Over-fetch (RPC caps at 20) since filtering out navigation queries below
  // can drop the count under `limit`.
  const { data, error } = await supabase.rpc("get_trending_searches" as any, {
    p_limit: Math.min(limit * 3, 20),
  } as any);

  if (error || !data) return [];
  return (data as Array<{ query_text: string; hit_count: number }>)
    .filter((row) => !isNavigationQuery(row.query_text))
    .slice(0, limit)
    .map((row) => ({
      query: row.query_text,
      count: row.hit_count,
    }));
}
