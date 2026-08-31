// Topic search: one question, faculty and seniors and things to enter, in one
// answer.
//
// "I have a project on quantum computing, who can help?" returns professors
// whose listed research matches AND seniors who have the skills. Nothing else
// on campus answers across both halves at once — that is the whole feature.
//
// Opportunities are in the same index, which is what makes "is there any
// national level coding contest I can enter" work: the question says "contest",
// the listing says "hackathon", and they share no keyword at all.
//
// Groups and board posts joined the index too, because on a campus the answer
// is often a room rather than a person — "where do people build robots" wants
// the robotics group, and "my laptop won't boot before the demo" wants the
// thread where three people already solved it. A private group is findable by
// name (that is how anyone asks to join); the posts inside it are not.
//
// Retrieve, then (optionally) explain. This function only retrieves. It embeds
// the question and hands it to search_knowledge(), which does a vector lookup
// in Postgres. No model is asked to *pick* people, so it structurally cannot
// invent a professor who does not exist — a real failure mode of the
// prompt-stuffing approach in ai-chatbot, which sends the whole mentor list to
// Gemini and asks for IDs back.
//
// Ranking is similarity only. Ratings ride along in metadata for display and
// never order the list: these are named real people on a publicly indexable
// page, and "worst-rated professor" is not a list this project builds.
//
// Ask the question more than one way. A caller may send `queries` instead of
// `query`, and each phrasing is embedded, searched, and fused by Reciprocal
// Rank Fusion. One embedding is one guess at where an answer lives, and a long
// question — "when are midterms for btech cse 7th sem starting" — puts that
// guess in the wrong place: the branch and cohort words outweigh the question,
// and the page comes back with twenty-three professors and no calendar. Several
// phrasings only agree on what the question was actually about.
//
// Both legs, always. Alongside the vector search, every request runs a
// Postgres full-text search (keyword_search_knowledge, 20260831160000) and
// fuses it into the same ranking. Embeddings blur exact tokens — "hall
// ticket", a reference number, a course code — and those are what students
// type. Where the keyword leg's migration has not been applied, it logs and
// returns nothing rather than failing the search.
//
// `ensure_types` reserves slots for the category the caller believes the
// question belongs to. The single top-N across all entity types is a race an
// exhaustively-indexed type always wins, and losing it is invisible — a healthy
// `total` with the answer missing from it.
//
// AUTH: public by design (topic search is public, and public pages can rank in
// search, which is free distribution). verify_jwt = false so signed-out students
// can use it; a caller's JWT is read when present only to widen visibility.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import {
  getPrioritizedGeminiKeys,
  markGeminiKeyCooldown,
  markGeminiKeySuccess,
} from "../_shared/gemini-pool.ts";

const MODEL = Deno.env.get("EMBEDDING_MODEL") ?? "gemini-embedding-001";
const DIMENSIONS = 768;

const MIN_QUERY = 3;
const MAX_QUERY = 300;
/**
 * How many phrasings of one question may be embedded and fused.
 *
 * Each costs an embedding on a cache miss, so this is the ceiling on what one
 * novel search can spend. Three covers distilled / reformulated / verbatim,
 * which is the spread that matters; more phrasings return diminishing agreement.
 */
const MAX_QUERIES = 3;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/** Cache key. Case and surrounding space must not produce a second API call. */
async function hashQuery(query: string): Promise<string> {
  const normalised = query.trim().toLowerCase().replace(/\s+/g, " ");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalised));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * RETRIEVAL_QUERY, not RETRIEVAL_DOCUMENT. Gemini deliberately embeds a
 * question and a stored passage into different places, and using the document
 * task type for both halves measurably degrades matching. embed-knowledge uses
 * RETRIEVAL_DOCUMENT for the other side of this pair.
 */
async function embedQuery(text: string): Promise<number[]> {
  const errors: string[] = [];
  const keys = getPrioritizedGeminiKeys();

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: `models/${MODEL}`,
            content: { parts: [{ text }] },
            taskType: "RETRIEVAL_QUERY",
            outputDimensionality: DIMENSIONS,
          }),
        },
      );

      if (response.status === 429) {
        markGeminiKeyCooldown(key, 429);
        errors.push(`key_${i + 1}=429`);
        continue; // Failover to next key in pool
      }

      if (response.status >= 500) {
        markGeminiKeyCooldown(key, response.status);
        errors.push(`key_${i + 1}=${response.status}`);
        continue;
      }

      if (!response.ok) {
        errors.push(`key_${i + 1}=${response.status}:${(await response.text()).slice(0, 100)}`);
        continue;
      }

      const body = await response.json();
      const values: number[] = body.embedding?.values ?? [];

      if (values.length !== DIMENSIONS) {
        throw new Error(`expected ${DIMENSIONS} dimensions, got ${values.length}`);
      }

      markGeminiKeySuccess(key);
      const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
      return norm > 0 ? values.map((v) => v / norm) : values;
    } catch (err) {
      errors.push(`key_${i + 1}=${err instanceof Error ? err.message : String(err)}`);
    }
  }

  throw new Error(`Gemini embedding failed across all keys: ${errors.join(" | ")}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (getPrioritizedGeminiKeys().length === 0) return json({ error: "Search is not configured" }, 503);

  let payload: {
    query?: string;
    queries?: string[];
    limit?: number;
    types?: string[];
    min_similarity?: number;
    ensure_types?: string[];
    ensure_limit?: number;
  } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Send a JSON body with a `query`" }, 400);
  }

  // `queries` is the multi-phrasing form; `query` remains the whole API for
  // every existing caller. The first entry is the canonical one — it names the
  // search in the response and in analytics.
  const requested = (payload.queries?.length ? payload.queries : [payload.query ?? ""])
    .map((q) => (typeof q === "string" ? q.trim() : ""))
    .filter((q) => q.length >= MIN_QUERY && q.length <= MAX_QUERY);

  const queries = Array.from(new Set(requested)).slice(0, MAX_QUERIES);
  const query = queries[0] ?? (payload.query ?? "").trim();

  if (queries.length === 0) {
    const raw = (payload.query ?? payload.queries?.[0] ?? "").trim();
    return json(
      {
        error:
          raw.length > MAX_QUERY
            ? `Keep it under ${MAX_QUERY} characters`
            : `Type at least ${MIN_QUERY} characters`,
      },
      400,
    );
  }

  // Present only so a signed-in caller can reach 'signed_in' chunks later.
  // Faculty and mentors are public today, so an anonymous search is complete.
  let viewer: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    viewer = data?.user?.id ?? null;
  }

  type Row = {
    entity_type: string;
    entity_id: string;
    title: string;
    subtitle: string | null;
    body: string | null;
    metadata: Record<string, unknown>;
    source_path: string;
    similarity: number;
    /** Present on rows from the keyword leg; 0-1, absent from a vector-only row. */
    keyword_rank?: number;
  };

  const allTypes =["faculty", "mentor", "student", "opportunity", "community", "post", "document", "notice", "article"];
  const limit = Math.min(Math.max(payload.limit ?? 12, 1), 50);

  try {
    /**
     * One embedding, cached by the hash of its own text.
     *
     * Every variant of a question caches separately, which is the point: the
     * second student to ask the same thing pays nothing, and the second student
     * to ask it *differently* still pays only for the phrasings that are new.
     */
    const embedFor = async (text: string): Promise<{ embedding: number[]; cached: boolean }> => {
      const queryHash = await hashQuery(text);

      const { data: hit } = await supabaseAdmin
        .from("search_query_cache")
        .select("embedding")
        .eq("query_hash", queryHash)
        .maybeSingle();

      if (hit?.embedding) {
        // Fire-and-forget: usage stats must never delay a search response.
        supabaseAdmin
          .rpc("touch_search_cache", { p_hash: queryHash })
          .then(() => {})
          .catch(() => {});
        return {
          embedding: typeof hit.embedding === "string" ? JSON.parse(hit.embedding) : hit.embedding,
          cached: true,
        };
      }

      const embedding = await embedQuery(text);
      await supabaseAdmin.from("search_query_cache").upsert(
        {
          query_hash: queryHash,
          query_text: text.slice(0, MAX_QUERY),
          embedding: JSON.stringify(embedding),
        },
        { onConflict: "query_hash" },
      );
      return { embedding, cached: false };
    };

    const search = async (embedding: number[], types: string[], rowLimit: number): Promise<Row[]> => {
      const { data, error } = await supabaseAdmin.rpc("search_knowledge", {
        p_embedding: JSON.stringify(embedding),
        p_entity_types: types,
        p_limit: rowLimit,
        p_viewer: viewer,
        // 0.35 cuts the noisy tail of weak matches that appeared on broad queries
        // (e.g. searching "machine learning" returning every CSE person at ≈0.31).
        // Raised from 0.30 in migration 20260816090000_enrich_mentor_chunks.sql.
        p_min_similarity: payload.min_similarity ?? 0.35,
      });
      if (error) throw error;
      return (data ?? []) as Row[];
    };

    /**
     * The keyword leg.
     *
     * Vectors are good at "contest" matching "hackathon" and bad at exact
     * tokens — "hall ticket", "re-registration", a course code, a reference
     * number. Those are what students type. The two methods fail on opposite
     * inputs, so fusing them recovers answers that no amount of tuning either
     * one could reach.
     *
     * Runs on the distilled phrasing rather than the reader's whole sentence:
     * `keyword_search_knowledge` OR-s the terms, and the programme and cohort
     * words already stripped upstream would only add rank for chunks that
     * mention a branch.
     */
    const keywordSearch = async (text: string, types: string[], rowLimit: number): Promise<Row[]> => {
      const { data, error } = await supabaseAdmin.rpc("keyword_search_knowledge", {
        p_query: text,
        p_entity_types: types,
        p_limit: rowLimit,
        p_viewer: viewer,
      });
      // Never fatal. The vector leg is the primary route, and a project whose
      // 20260831160000 migration has not been applied yet must keep searching
      // rather than 500 — a migration file in the repo is not a migration in
      // the database.
      if (error) {
        console.error("keyword_search_knowledge unavailable:", error.message);
        return [];
      }
      return ((data ?? []) as Row[]).map((row) => ({ ...row, similarity: row.similarity ?? 0 }));
    };

    const embedded = await Promise.all(queries.map(embedFor));
    const cached = embedded.every((e) => e.cached);

    const [lists, keywordHits] = await Promise.all([
      Promise.all(embedded.map((e) => search(e.embedding, payload.types ?? allTypes, limit))),
      keywordSearch(queries[0], payload.types ?? allTypes, limit),
    ]);

    /**
     * Reciprocal Rank Fusion.
     *
     * Similarity scores from two different questions are not on a comparable
     * scale — a 0.61 against a four-word query and a 0.61 against a nine-word
     * one mean different things — so the ranks are fused, not the scores. A
     * chunk that places well against several phrasings of the question beats
     * one that places brilliantly against a single phrasing, which is exactly
     * the failure being fixed: a whole page of CSE professors, every one of
     * them a strong match for a query the reader never asked.
     *
     * K=60 is the constant from the original TREC work; it flattens the gap
     * between the first few ranks so a narrow win does not become a landslide.
     */
    const RRF_K = 60;
    const fused = new Map<string, { row: Row; score: number; keywordRank: number }>();
    const keyOf = (r: Row) => `${r.entity_type}|${r.entity_id}|${r.source_path}|${r.title}`;

    const fuse = (list: Row[], weight = 1) => {
      list.forEach((row, index) => {
        const key = keyOf(row);
        const existing = fused.get(key);
        const contribution = weight / (RRF_K + index + 1);
        const rank = row.keyword_rank ?? 0;
        if (existing) {
          existing.score += contribution;
          existing.keywordRank = Math.max(existing.keywordRank, rank);
          // Keep the best evidence any leg found. Downstream ranking reads
          // `similarity` and knows nothing about fusion.
          if (row.similarity > existing.row.similarity) existing.row = row;
        } else {
          fused.set(key, { row, score: contribution, keywordRank: rank });
        }
      });
    };

    lists.forEach((list) => fuse(list));
    // Equal weight with one phrasing's vector list. A chunk both legs agree on
    // rises; a chunk only the keyword leg found still gets a place, which is
    // the point — the vector floor is exactly what was hiding it.
    fuse(keywordHits);

    /**
     * A floor for the category the question was actually about.
     *
     * search_knowledge takes one top-N across every entity type at once, so a
     * type with thousands of chunks can crowd out a type with dozens even when
     * the second one holds the answer. Faculty and mentors are indexed
     * exhaustively; the academic calendar is a handful of sections. Reserving a
     * few slots costs one extra query and makes "Guidelines 0" impossible on a
     * question that was classified as a guidelines question.
     */
    const ensureTypes = (payload.ensure_types ?? []).filter((t) => allTypes.includes(t));
    if (ensureTypes.length > 0) {
      const ensureLimit = Math.min(Math.max(payload.ensure_limit ?? 3, 1), 10);
      const [vectorFloor, keywordFloor] = await Promise.all([
        search(embedded[0].embedding, ensureTypes, ensureLimit),
        keywordSearch(queries[0], ensureTypes, ensureLimit),
      ]);
      // Half weight: these are guaranteed a place, not a promotion. Anything
      // that also ranked on its own merits keeps the score it earned.
      fuse(vectorFloor, 0.5);
      fuse(keywordFloor, 0.5);
    }

    const rows = Array.from(fused.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      // `keyword_rank` rides out to the client because documents have never had
      // a lexical signal to score with — every other entity type gets one from
      // its own SQL query in useSearchResults, and a document arriving with
      // similarity alone was competing on one leg.
      .map((entry) => ({ ...entry.row, keyword_rank: entry.keywordRank }));

    // Grouped server-side so the client renders each list without re-filtering,
    // and so "no faculty but three mentors" is expressible.
    //
    // Every entity type search_knowledge can return needs a group here. It had
    // only faculty and mentors when opportunities were added to the index, so
    // opportunity rows were retrieved, counted in `total`, and then dropped —
    // silently, because a healthy-looking count hid a short list. `other` exists
    // so the next entity type degrades to visible-but-ungrouped instead of
    // vanishing.
    const grouped = {
      faculty: rows.filter((r) => r.entity_type === "faculty"),
      mentors: rows.filter((r) => r.entity_type === "mentor"),
      students: rows.filter((r) => r.entity_type === "student"),
      opportunities: rows.filter((r) => r.entity_type === "opportunity"),
      communities: rows.filter((r) => r.entity_type === "community"),
      posts: rows.filter((r) => r.entity_type === "post"),
      documents: rows.filter((r) => r.entity_type === "document"),
      notices: rows.filter((r) => r.entity_type === "notice"),
      articles: rows.filter((r) => r.entity_type === "article"),
    };
    const claimed = new Set(["faculty", "mentor", "student", "opportunity", "community", "post", "document", "notice", "article"]);

    return json({
      query,
      // Which phrasings were actually embedded. Verifying this function is
      // working means reading this, not the status code.
      queries,
      cached,
      total: rows.length,
      ...grouped,
      other: rows.filter((r) => !claimed.has(r.entity_type)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Quota is the one failure a student might actually hit, and "try again in
    // a minute" is actionable where a stack trace is not.
    if (message.includes("429")) {
      return json({ error: "Search is busy right now — try again in a minute." }, 429);
    }
    console.error("semantic-search failed:", message);
    return json({ error: "Search failed. Please try again." }, 500);
  }
});
