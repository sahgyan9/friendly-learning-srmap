import { supabase } from "@/integrations/supabase/client";

/**
 * public.campus_documents isn't in the generated Database types — the
 * 20260820100000_campus_documents.sql migration added the table but
 * types.ts was never regenerated against it (same gap as ai_overview_feedback
 * in CampusAIOverview.tsx). Cast through `any` like that call does rather than
 * hand-rolling a Database type override that would just go stale too.
 */
export interface CampusDocumentSection {
  id: string;
  document_slug: string;
  document_title: string;
  academic_year: string | null;
  category: string;
  section_heading: string;
  content: string;
  page_number: number | null;
  source_filename: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * A "document" in knowledge_chunks is really one row per section — the same
 * document_slug repeats across many rows (one per page/heading) and they all
 * share a single source_path (`/documents/:slug`). So the public reader page
 * for a citation needs every section for that slug, in reading order, not
 * just one row.
 */
export const getDocumentSections = async (slug: string) => {
  const { data, error } = await (supabase as any)
    .from("campus_documents")
    .select("*")
    .eq("document_slug", slug)
    .eq("is_published", true)
    .order("page_number", { ascending: true, nullsFirst: true });

  if (error) {
    console.error("Error fetching document sections:", error);
    return { data: null, error };
  }

  return { data: (data ?? []) as CampusDocumentSection[], error: null };
};
