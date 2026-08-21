// Developer-run ingestion tool for public.campus_documents.
//
// campus_documents has no INSERT policy for anon/authenticated by design
// (20260820100000_campus_documents.sql: "written by a developer-run script",
// unlike campus_notices which admins write from the browser) — GRANT ALL is
// service_role only. This function IS that script, running server-side so
// the service role key never has to leave the project's own secret store.
//
// Auth is a dedicated INGEST_SECRET (not CRON_SECRET, not the service role
// key) generated and set for this one purpose — nobody outside this function
// ever needs to see it.
//
// Idempotent per document_slug: re-running with the same slug replaces that
// document's rows rather than duplicating them, so a content fix is just
// "run it again."

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const INGEST_SECRET = Deno.env.get("INGEST_SECRET") ?? "";

const supabaseAdmin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

type DocumentRow = {
  document_slug: string;
  document_title: string;
  academic_year?: string;
  category: string;
  section_heading: string;
  content: string;
  page_number?: number;
  source_filename?: string;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!INGEST_SECRET || req.headers.get("x-ingest-secret") !== INGEST_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { rows?: DocumentRow[] };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const rows = payload.rows ?? [];
  if (!Array.isArray(rows) || rows.length === 0) {
    return json({ error: "rows: DocumentRow[] is required" }, 400);
  }
  for (const r of rows) {
    if (!r.document_slug || !r.document_title || !r.category || !r.section_heading || !r.content) {
      return json({ error: "Each row needs document_slug, document_title, category, section_heading, content" }, 400);
    }
  }

  const slugs = [...new Set(rows.map((r) => r.document_slug))];

  const { error: deleteError } = await supabaseAdmin
    .from("campus_documents")
    .delete()
    .in("document_slug", slugs);
  if (deleteError) return json({ error: `delete failed: ${deleteError.message}` }, 500);

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("campus_documents")
    .insert(rows)
    .select("id");
  if (insertError) return json({ error: `insert failed: ${insertError.message}` }, 500);

  const { error: rebuildError } = await supabaseAdmin.rpc("rebuild_document_chunks");
  if (rebuildError) return json({ error: `insert ok but rebuild_document_chunks failed: ${rebuildError.message}` }, 500);

  // Best-effort — the hourly cron top-up will catch anything this misses.
  // embed-knowledge authenticates itself via CRON_SECRET (see its own header
  // comment); this function has that secret in its own env like any other
  // server-side function here, so it's passed through rather than relying on
  // supabaseAdmin.functions.invoke's default (unauthenticated) call.
  fetch(`${SUPABASE_URL}/functions/v1/embed-knowledge`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "" },
    body: "{}",
  }).catch((e) => console.error("embed-knowledge trigger failed:", e));

  return json({ slugs, inserted: inserted?.length ?? 0 });
});
