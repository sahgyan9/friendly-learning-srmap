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
// AUTH: public by design (topic search is public, and public pages can rank in
// search, which is free distribution). verify_jwt = false so signed-out students
// can use it; a caller's JWT is read when present only to widen visibility.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = Deno.env.get("EMBEDDING_MODEL") ?? "gemini-embedding-001";
const GEMINI_KEY = Deno.env.get("Gemini_API_Key") ?? "";
const DIMENSIONS = 768;

const MIN_QUERY = 3;
const MAX_QUERY = 300;

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
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:embedContent?key=${GEMINI_KEY}`,
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

  if (!response.ok) {
    throw new Error(`Gemini ${MODEL} -> ${response.status}: ${(await response.text()).slice(0, 200)}`);
  }

  const body = await response.json();
  const values: number[] = body.embedding?.values ?? [];

  if (values.length !== DIMENSIONS) {
    throw new Error(`expected ${DIMENSIONS} dimensions, got ${values.length}`);
  }

  // Must match the normalisation embed-knowledge applies to documents, or the
  // two sides of the comparison are on different scales and the 0.30 relevance
  // floor stops meaning anything.
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm > 0 ? values.map((v) => v / norm) : values;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!GEMINI_KEY) return json({ error: "Search is not configured" }, 503);

  let payload: { query?: string; limit?: number; types?: string[] } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Send a JSON body with a `query`" }, 400);
  }

  const query = (payload.query ?? "").trim();
  if (query.length < MIN_QUERY) {
    return json({ error: `Type at least ${MIN_QUERY} characters` }, 400);
  }
  if (query.length > MAX_QUERY) {
    return json({ error: `Keep it under ${MAX_QUERY} characters` }, 400);
  }

  // Present only so a signed-in caller can reach 'signed_in' chunks later.
  // Faculty and mentors are public today, so an anonymous search is complete.
  let viewer: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    viewer = data?.user?.id ?? null;
  }

  try {
    const queryHash = await hashQuery(query);

    // Cache first. Most searches on a campus repeat, and a hit costs one
    // primary-key lookup instead of one of ~100 embedding calls per minute.
    let embedding: number[] | null = null;
    let cached = false;

    const { data: hit } = await supabaseAdmin
      .from("search_query_cache")
      .select("embedding")
      .eq("query_hash", queryHash)
      .maybeSingle();

    if (hit?.embedding) {
      embedding = typeof hit.embedding === "string" ? JSON.parse(hit.embedding) : hit.embedding;
      cached = true;
      // Fire-and-forget: usage stats must never delay a search response.
      supabaseAdmin
        .rpc("touch_search_cache", { p_hash: queryHash })
        .then(() => {})
        .catch(() => {});
    } else {
      embedding = await embedQuery(query);
      await supabaseAdmin.from("search_query_cache").upsert(
        {
          query_hash: queryHash,
          query_text: query.slice(0, MAX_QUERY),
          embedding: JSON.stringify(embedding),
        },
        { onConflict: "query_hash" },
      );
    }

    const { data: results, error } = await supabaseAdmin.rpc("search_knowledge", {
      p_embedding: JSON.stringify(embedding),
      p_entity_types: payload.types ?? ["faculty", "mentor", "student", "opportunity", "community", "post"],
      p_limit: Math.min(Math.max(payload.limit ?? 12, 1), 50),
      p_viewer: viewer,
    });

    if (error) throw error;

    type Row = {
      entity_type: string;
      entity_id: string;
      title: string;
      subtitle: string | null;
      metadata: Record<string, unknown>;
      source_path: string;
      similarity: number;
    };

    const rows = (results ?? []) as Row[];

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
    };
    const claimed = new Set(["faculty", "mentor", "student", "opportunity", "community", "post"]);

    return json({
      query,
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
