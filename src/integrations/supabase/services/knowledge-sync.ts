import { supabase } from "@/integrations/supabase/client";

/**
 * URL slug for a stored article or blog post: the full title, lowercased, with
 * runs of anything other than a-z0-9 collapsed to single hyphens. Not the same
 * as `slugify` in lib/utils, which truncates to a few words for display-only
 * breadcrumbs — changing either one would change existing URLs or labels.
 */
export const titleToSlug = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Best-effort nudge so a new admin-authored notice or article becomes
 * searchable in /ask immediately instead of on the next 10-minute
 * embed-knowledge-topup run.
 *
 * embed-knowledge only accepts CRON_SECRET, the service role, or an admin JWT,
 * so this is only worth calling from admin screens; for anyone else it is a
 * guaranteed 401. functions.invoke() reports HTTP failures in `error` rather
 * than throwing, so the result is checked explicitly — a try/catch alone never
 * saw the failure.
 */
export const triggerEmbedding = async () => {
  try {
    const { error } = await supabase.functions.invoke("embed-knowledge");
    if (error) console.warn("embed-knowledge trigger failed; the scheduled top-up will embed it:", error.message);
  } catch (error) {
    console.warn("embed-knowledge trigger failed; the scheduled top-up will embed it:", error);
  }
};
