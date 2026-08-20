import { supabase } from "../client";

export async function getDynamicRelatedSearches(query: string, limit: number = 6): Promise<string[]> {
  try {
    const { data, error } = await (supabase.rpc as any)("get_related_searches", {
      p_query: query,
      p_limit: limit,
    });

    if (error) {
      console.error("Failed to fetch related searches:", error);
      return [];
    }

    if (!data) return [];

    return data.map((row) => row.query_text);
  } catch (err) {
    console.error("Exception fetching related searches:", err);
    return [];
  }
}
