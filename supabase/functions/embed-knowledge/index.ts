// Fills in the missing embeddings on public.knowledge_chunks.
//
// The retrieval layer is deliberately split in two: SQL owns *what* is
// searchable (the projector functions rebuild knowledge_chunks from the source
// tables), and this function owns only the one thing SQL cannot do — turning
// text into a vector by calling an embedding API. It therefore has no knowledge
// of faculty, mentors, or any other entity type. Adding a new searchable thing
// is a SQL change; this file never needs to know.
//
// It is a top-up, not a rebuild: it selects rows where `embedding IS NULL` and
// fills them. Re-running is safe and cheap, and a run that dies halfway leaves
// the finished rows done. That is what makes the pg_cron schedule harmless.
//
// AUTH: verify_jwt = false, same reasoning as sync-faculty — it authenticates
// itself below with either CRON_SECRET or an is_admin JWT, because the platform
// gate only verifies the anon key (which ships in the client bundle) and would
// break the cron path that carries no user JWT.
//
// Invoke:
//   POST /functions/v1/embed-knowledge                 -> embed a batch
//   POST /functions/v1/embed-knowledge {"probe":true}  -> report model + dims,
//                                                         touches no data

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// Overridable so the model can be changed without a code edit.
const MODEL = Deno.env.get("EMBEDDING_MODEL") ?? "text-embedding-004";
const GEMINI_KEY = Deno.env.get("Gemini_API_Key") ?? "";

// Gemini caps batchEmbedContents at 100 requests. 250 rows/run keeps a single
// invocation well inside the edge function CPU budget while still clearing ~600
// faculty in three runs.
const BATCH = 100;
const MAX_ROWS_PER_RUN = 250;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/**
 * `taskType` is not cosmetic. Gemini embeds a stored passage and a user's
 * question into deliberately different places, and using RETRIEVAL_DOCUMENT for
 * both halves measurably degrades matching. Documents are embedded here;
 * queries are embedded in semantic-search with RETRIEVAL_QUERY.
 */
async function embedBatch(texts: string[], taskType: string): Promise<number[][]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          taskType,
        })),
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini ${MODEL} -> ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  const body = await response.json();
  const embeddings = (body.embeddings ?? []).map((e: { values: number[] }) => e.values);

  if (embeddings.length !== texts.length) {
    throw new Error(`asked for ${texts.length} embeddings, got ${embeddings.length}`);
  }

  return embeddings;
}

async function isAuthorised(req: Request): Promise<boolean> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return true;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const { data, error } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data?.user) return false;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile?.is_admin === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!(await isAuthorised(req))) return json({ error: "Unauthorized" }, 401);
  if (!GEMINI_KEY) return json({ error: "Gemini_API_Key is not set" }, 500);

  let payload: { probe?: boolean; listModels?: boolean } = {};
  try {
    payload = await req.json();
  } catch {
    // An empty body is the normal cron invocation.
  }

  try {
    // Which models this key can actually reach. Model availability differs by
    // API version and by key, so this is the authoritative answer rather than
    // whatever the docs said — `text-embedding-004` 404s here despite being the
    // widely-documented name.
    if (payload.listModels) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}&pageSize=200`,
      );
      const body = await response.json();
      return json({
        embeddingModels: (body.models ?? [])
          .filter((m: { supportedGenerationMethods?: string[] }) =>
            (m.supportedGenerationMethods ?? []).some((s) => s.toLowerCase().includes("embed")),
          )
          .map((m: { name: string; supportedGenerationMethods: string[] }) => ({
            name: m.name,
            methods: m.supportedGenerationMethods,
          })),
      });
    }

    // Probe: confirms the model name resolves and reports the dimension the
    // knowledge_chunks column has to be declared with. Writes nothing.
    if (payload.probe) {
      const [vector] = await embedBatch(["research interests in machine learning"], "RETRIEVAL_DOCUMENT");
      return json({ model: MODEL, dimensions: vector.length, sample: vector.slice(0, 4) });
    }

    const { data: pending, error: selectError } = await supabaseAdmin
      .from("knowledge_chunks")
      .select("id, body")
      .is("embedding", null)
      .limit(MAX_ROWS_PER_RUN);

    if (selectError) throw selectError;
    if (!pending?.length) return json({ embedded: 0, remaining: 0, note: "nothing pending" });

    let embedded = 0;
    for (let i = 0; i < pending.length; i += BATCH) {
      const slice = pending.slice(i, i + BATCH);
      const vectors = await embedBatch(
        // Gemini rejects an empty string; a projector should never produce one,
        // but a single bad row must not stall the whole queue forever.
        slice.map((row) => (row.body?.trim() ? row.body.slice(0, 8000) : "(no description)")),
        "RETRIEVAL_DOCUMENT",
      );

      for (let j = 0; j < slice.length; j += 1) {
        const { error } = await supabaseAdmin
          .from("knowledge_chunks")
          .update({ embedding: JSON.stringify(vectors[j]), embedded_at: new Date().toISOString() })
          .eq("id", slice[j].id);
        if (error) throw error;
        embedded += 1;
      }
    }

    const { count: remaining } = await supabaseAdmin
      .from("knowledge_chunks")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);

    return json({ model: MODEL, embedded, remaining: remaining ?? 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
