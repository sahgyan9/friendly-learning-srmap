// Syncs the SRM University-AP faculty directory into public.faculty.
//
// Source: the university's own WordPress REST API. The `faculty-profile` post
// type holds every faculty member across every school (~600 records), and the
// `school-category` taxonomy gives the department + school. Both are public and
// send CORS headers, but we pull them server-side so students never pay for a
// ~600-record scrape on page load and so a slow/offline srmap.edu.in cannot take
// the faculty page down.
//
// Idempotent: rows are upserted on `slug`. Profiles that disappear from the
// directory are marked is_active = false rather than deleted, so any ratings
// attached to them survive.
//
// AUTH: deployed with verify_jwt = false (see supabase/config.toml) because this
// function authenticates requests itself in isAuthorised() below — either a
// CRON_SECRET header or a JWT belonging to a user with is_admin = true. The
// platform JWT gate would only verify the anon key, which ships in the client
// bundle and so proves nothing, while breaking the scheduled cron path that
// carries no user JWT at all.
//
// Invoke:
//   POST /functions/v1/sync-faculty          (admin JWT, or CRON_SECRET header)
// Schedule it daily with pg_cron or the Supabase dashboard scheduler.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const WP_BASE = "https://www.srmap.edu.in/wp-json/wp/v2";
const PER_PAGE = 100;
const MAX_PAGES = 20; // hard stop; 600 records ≈ 6 pages

interface WpTerm {
  id: number;
  name: string;
  slug: string;
  parent: number;
}

interface WpFacultyProfile {
  id: number;
  slug: string;
  link: string;
  modified?: string;
  title: { rendered: string };
  class_list?: string[];
  featured_media?: number;
}

interface Taxonomy {
  bySlug: Map<string, WpTerm>;
  byId: Map<number, WpTerm>;
}

interface WpMedia {
  id: number;
  source_url?: string;
  media_details?: { sizes?: Record<string, { source_url?: string }> };
}

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/** WordPress leaves HTML entities in `title.rendered`. */
function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`GET ${url} -> ${response.status}`);
  }
  return (await response.json()) as T;
}

/**
 * school-category terms: top-level (parent 0) are schools, children are
 * departments. Indexed by slug (to match class_list entries) and by id (to walk
 * a department up to its school). ~36 terms today, well inside WP's 100 cap.
 */
async function fetchSchoolCategories(): Promise<Taxonomy> {
  const terms = await fetchJson<WpTerm[]>(
    `${WP_BASE}/school-category?per_page=100&_fields=id,name,slug,parent`,
  );
  return {
    bySlug: new Map(terms.map((term) => [term.slug, term])),
    byId: new Map(terms.map((term) => [term.id, term])),
  };
}

async function fetchAllFacultyProfiles(): Promise<WpFacultyProfile[]> {
  const all: WpFacultyProfile[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    // `_fields` and `_embed` are mutually exclusive in WP — asking for both
    // silently drops `_embedded`. Requesting the media IDs here and resolving
    // them in one batch below keeps the payload at ~48KB/page instead of ~1.2MB.
    const url =
      `${WP_BASE}/faculty-profile?per_page=${PER_PAGE}&page=${page}` +
      `&_fields=id,slug,link,modified,title,class_list,featured_media`;

    const batch = await fetchJson<WpFacultyProfile[]>(url);
    all.push(...batch);
    if (batch.length < PER_PAGE) break;
  }

  return all;
}

/**
 * Resolve featured-media IDs to image URLs, preferring the 300px "medium"
 * rendition over the multi-megabyte original.
 */
async function fetchMediaUrls(mediaIds: number[]): Promise<Map<number, string>> {
  const urls = new Map<number, string>();
  const unique = Array.from(new Set(mediaIds.filter((id) => id > 0)));

  for (let i = 0; i < unique.length; i += PER_PAGE) {
    const batch = unique.slice(i, i + PER_PAGE);
    const url =
      `${WP_BASE}/media?include=${batch.join(",")}&per_page=${PER_PAGE}` +
      `&_fields=id,source_url,media_details`;

    let media: WpMedia[];
    try {
      media = await fetchJson<WpMedia[]>(url);
    } catch {
      continue; // Missing photos are cosmetic; never fail a sync over them.
    }

    for (const item of media) {
      const sizes = item.media_details?.sizes ?? {};
      const best =
        sizes.medium?.source_url ??
        sizes.medium_large?.source_url ??
        sizes.large?.source_url ??
        item.source_url;
      if (best) urls.set(item.id, best);
    }
  }

  return urls;
}

/**
 * Resolve department + school from the `school-category-*` entries WordPress
 * bakes into class_list. The taxonomy's parent link tells the two apart:
 * top-level terms are schools, children are departments.
 */
function resolveAffiliation(
  profile: WpFacultyProfile,
  taxonomy: Taxonomy,
): { department: string; school: string | null } {
  const slugs = (profile.class_list ?? [])
    .filter((entry) => entry.startsWith("school-category-"))
    .map((entry) => entry.replace("school-category-", ""));

  let departmentTerm: WpTerm | null = null;
  let schoolTerm: WpTerm | null = null;

  for (const slug of slugs) {
    const term = taxonomy.bySlug.get(slug);
    if (!term) continue;
    if (term.parent === 0) {
      schoolTerm ??= term;
    } else {
      departmentTerm ??= term;
    }
  }

  // Most profiles list only their department, not the school above it — relying
  // on both being present left ~70% of rows with a null school. The department
  // term already records its school in `parent`, so climb to the root instead.
  if (!schoolTerm && departmentTerm) {
    let cursor: WpTerm | undefined = taxonomy.byId.get(departmentTerm.parent);
    while (cursor && cursor.parent !== 0) {
      cursor = taxonomy.byId.get(cursor.parent);
    }
    schoolTerm = cursor ?? null;
  }

  // Some profiles only carry a school term (central offices, directorates).
  return {
    department: departmentTerm?.name ?? schoolTerm?.name ?? "General",
    school: schoolTerm?.name ?? null,
  };
}

function toFacultyRow(
  profile: WpFacultyProfile,
  taxonomy: Taxonomy,
  mediaUrls: Map<number, string>,
  syncedAt: string,
) {
  const { department, school } = resolveAffiliation(profile, taxonomy);

  return {
    slug: profile.slug,
    name: decodeEntities(profile.title?.rendered ?? profile.slug),
    department,
    school,
    profile_url: profile.link ?? null,
    image_url: mediaUrls.get(profile.featured_media ?? 0) ?? null,
    source: "srmap-directory",
    is_active: true,
    last_synced_at: syncedAt,
  };
}

type FacultyRow = ReturnType<typeof toFacultyRow>;

/**
 * Honorifics and punctuation vary between duplicate listings of the same
 * person — "Mr. Vikas Choudhary" against "Mr Vikas Choudhary", "Dr Arun Kumar"
 * against "Dr Arun Kumar." — so neither is part of the identity.
 */
function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(dr|prof|professor|mr|mrs|ms|miss|shri|smt)\.?\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Current rating counts, keyed by slug, so dedup never strands a review. */
async function fetchRatingCounts(slugs: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  for (let i = 0; i < slugs.length; i += 200) {
    const { data } = await supabaseAdmin
      .from("faculty")
      .select("slug, rating_count")
      .in("slug", slugs.slice(i, i + 200));

    for (const row of data ?? []) counts.set(row.slug, row.rating_count ?? 0);
  }

  return counts;
}

/**
 * The upstream directory publishes some people more than once — the same name
 * in the same department at two different URLs, each a separate WordPress post
 * (/vikas-choudhary/ is post 123973, /mr-vikas-choudhary/ is post 123464). The
 * slug-level dedupe cannot see these because the slugs genuinely differ.
 *
 * Left alone each copy gets its own /faculty/<slug> page, and ratings divide
 * between them, so neither page shows the professor's real score — which is
 * the one thing the feature exists to do.
 *
 * The match is deliberately narrow: same normalised name AND same department.
 * Name alone would collapse two different people, since SRM AP has a Dr Arun
 * Kumar in Mathematics and another in Electronics and Communication.
 *
 * Losers are simply left out of the upsert. Their last_synced_at then stays
 * behind syncStartedAt, so the existing retirement step marks them inactive,
 * which hides the page without deleting the row or its ratings.
 */
function dropDuplicatePeople(
  rows: FacultyRow[],
  modifiedBySlug: Map<string, string>,
  ratingCounts: Map<string, number>,
): { kept: FacultyRow[]; dropped: Array<{ slug: string; inFavourOf: string; name: string }> } {
  const groups = new Map<string, FacultyRow[]>();

  for (const row of rows) {
    const key = `${normaliseName(row.name)}::${row.department.toLowerCase()}`;
    const group = groups.get(key);
    if (group) group.push(row);
    else groups.set(key, [row]);
  }

  const kept: FacultyRow[] = [];
  const dropped: Array<{ slug: string; inFavourOf: string; name: string }> = [];

  for (const group of groups.values()) {
    if (group.length === 1) {
      kept.push(group[0]);
      continue;
    }

    // Whichever copy students have already rated wins, so no existing review is
    // hidden. Failing that, the most recently edited upstream post is the one
    // the university is actually maintaining.
    group.sort((a, b) => {
      const byRatings = (ratingCounts.get(b.slug) ?? 0) - (ratingCounts.get(a.slug) ?? 0);
      if (byRatings !== 0) return byRatings;
      return (
        Date.parse(modifiedBySlug.get(b.slug) ?? "") -
        Date.parse(modifiedBySlug.get(a.slug) ?? "")
      );
    });

    kept.push(group[0]);
    for (const loser of group.slice(1)) {
      dropped.push({ slug: loser.slug, inFavourOf: group[0].slug, name: loser.name });
    }
  }

  return { kept, dropped };
}

async function isAuthorised(req: Request): Promise<boolean> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return true;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return false;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile?.is_admin === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!(await isAuthorised(req))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const syncStartedAt = new Date().toISOString();

  try {
    const [taxonomy, profiles] = await Promise.all([
      fetchSchoolCategories(),
      fetchAllFacultyProfiles(),
    ]);

    const mediaUrls = await fetchMediaUrls(
      profiles.map((profile) => profile.featured_media ?? 0),
    );
    const syncedAt = new Date().toISOString();

    // Dedupe on slug — the directory occasionally serves the same post twice.
    const bySlug = Array.from(
      new Map(
        profiles
          .filter((profile) => profile.slug)
          .map((profile) => [profile.slug, toFacultyRow(profile, taxonomy, mediaUrls, syncedAt)]),
      ).values(),
    );

    if (bySlug.length === 0) {
      return json({ error: "Directory returned no faculty; refusing to sync" }, 502);
    }

    // Then dedupe on the person, which slugs alone cannot catch.
    const modifiedBySlug = new Map(
      profiles.filter((p) => p.slug && p.modified).map((p) => [p.slug, p.modified as string]),
    );
    const ratingCounts = await fetchRatingCounts(bySlug.map((row) => row.slug));
    const { kept: rows, dropped } = dropDuplicatePeople(bySlug, modifiedBySlug, ratingCounts);

    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabaseAdmin
        .from("faculty")
        .upsert(rows.slice(i, i + CHUNK), { onConflict: "slug" });
      if (error) throw error;
    }

    // Retire anyone no longer listed, keeping their ratings intact. Anyone still
    // in the directory just had last_synced_at bumped past syncStartedAt by the
    // upsert above, so a timestamp comparison retires exactly the stale rows
    // without building a 600-slug NOT IN filter.
    const { error: retireError, count: retired } = await supabaseAdmin
      .from("faculty")
      .update({ is_active: false }, { count: "exact" })
      .eq("source", "srmap-directory")
      .eq("is_active", true)
      .lt("last_synced_at", syncStartedAt);

    if (retireError) throw retireError;

    return json({
      synced: rows.length,
      retired: retired ?? 0,
      // Surfaced rather than swallowed: every entry here is a person the
      // university's directory lists twice, and that is worth reporting to them.
      duplicatesDropped: dropped.length,
      duplicates: dropped,
      departments: new Set(rows.map((row) => row.department)).size,
      schools: new Set(rows.map((row) => row.school).filter(Boolean)).size,
      missingSchool: rows.filter((row) => !row.school).length,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
