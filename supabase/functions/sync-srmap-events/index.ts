// Syncs SRMAP's public events feed into public.srmap_events_cache.
//
// Source: events.srmap.edu.in's WordPress REST API (`tribe_events`, the
// Events Calendar plugin's post type). Public and sends CORS headers, but
// pulled server-side so every visitor -- new or returning -- reads this
// project's own Postgres instead of a slow, uncached third-party site on
// every page load.
//
// Idempotent: rows are upserted on `id`. Anything not touched by a run --
// removed from the upstream feed, or aged past the 7-day grace window applied
// below -- is pruned by comparing last_synced_at against this run's start.
//
// AUTH: deployed with verify_jwt = false (see supabase/config.toml) because
// this function authenticates requests itself, same as sync-faculty -- either
// a CRON_SECRET header or a JWT belonging to an admin. The platform JWT gate
// would only verify the anon key, which ships in the client bundle and so
// proves nothing, while breaking the scheduled cron path that carries no user
// JWT at all.
//
// Invoke:
//   POST /functions/v1/sync-srmap-events   (admin JWT, or CRON_SECRET header)
//
// Scheduled by the pg_cron job `sync-srmap-events-daily`: 30 20 * * * (UTC),
// once every 24 hours -- campus events change a few times a week, not a few
// times an hour.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const PER_PAGE = 100;
const MAX_PAGES = 3;
const SRMAP_API_BASE =
  `https://events.srmap.edu.in/wp-json/wp/v2/tribe_events?per_page=${PER_PAGE}&_embed=1&order=desc`;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "'",
  rsquo: "'",
  ldquo: "“",
  rdquo: "”",
};

/**
 * WordPress returns titles and excerpts with entities already encoded
 * ("&#8211;", "&amp;"). Decoded here rather than with
 * `dangerouslySetInnerHTML`, which would hand an external feed the ability to
 * inject markup into the page this data is eventually rendered on.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

function stripHtml(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/** SRMAP's API returns "YYYY-MM-DD HH:mm:ss" in IST. */
function parseSRMAPDate(value: string): number {
  return new Date(value.replace(" ", "T") + "+05:30").getTime();
}

function extractDepartment(embedded: Record<string, unknown>): string {
  try {
    const terms = embedded["wp:term"] as unknown[][];
    for (const termGroup of terms) {
      for (const term of termGroup as Array<{ taxonomy: string; name: string }>) {
        if (term.taxonomy === "tribe_events_cat") return term.name;
      }
    }
  } catch {
    // ignore
  }
  return "SRMAP";
}

function extractEventType(embedded: Record<string, unknown>): string {
  try {
    const terms = embedded["wp:term"] as unknown[][];
    for (const termGroup of terms) {
      for (const term of termGroup as Array<{ taxonomy: string; name: string }>) {
        if (term.taxonomy === "cust_event_sub_menu") return term.name;
      }
    }
  } catch {
    // ignore
  }
  return "";
}

function extractImage(embedded: Record<string, unknown>): string | null {
  try {
    const media = embedded["wp:featuredmedia"] as Array<{ source_url: string }>;
    return media?.[0]?.source_url ?? null;
  } catch {
    return null;
  }
}

function isValidRegistrationLink(url: string, currentEventUrl: string): boolean {
  if (!url || url.startsWith("#") || url.startsWith("javascript:")) return false;
  if (url === currentEventUrl || url === currentEventUrl + "/") return false;
  if (url.includes("events.srmap.edu.in/feed") || url.includes("events.srmap.edu.in/comments") || url.includes("events.srmap.edu.in/events/")) return false;
  if (url.includes("wp-content") || url.includes("wp-includes") || url.includes("wp-json") || url.includes("xmlrpc.php")) return false;
  if (url.endsWith(".css") || url.endsWith(".js") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".webp")) return false;
  return true;
}

function extractRegistrationLink(html: string, currentEventUrl: string): { url: string; label?: string } | null {
  if (!html) return null;

  // 1. Look for zoom_link / webinar_links / elementor button
  const zoomLinkMatch = html.match(/class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*(?:zoom_link|webinar_links|elementor-button)[^"']*["']/i);

  if (zoomLinkMatch && isValidRegistrationLink(zoomLinkMatch[1], currentEventUrl)) {
    return { url: zoomLinkMatch[1], label: "Register Now" };
  }

  // 2. Look for explicit forms / registration platforms in hrefs
  const formPatterns = [
    /href=["'](https?:\/\/(?:forms\.gle|docs\.google\.com\/forms|forms\.office\.com|unstop\.com|devfolio\.co|lu\.ma|eventbrite\.com)[^"']*)["']/i,
    /href=["'](https?:\/\/[^"']*(?:register|registration|forms)[^"']*)["']/i
  ];

  for (const pattern of formPatterns) {
    const match = html.match(pattern);
    if (match && isValidRegistrationLink(match[1], currentEventUrl)) {
      return { url: match[1], label: "Register on Campus Portal" };
    }
  }

  // 3. Look for anchor tags with "Register", "RSVP", "Join", "Apply" text
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRegex.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();
    if (
      (text === "register" || text === "register now" || text === "rsvp" || text === "sign up" || text === "apply now" || text.includes("registration link")) &&
      isValidRegistrationLink(href, currentEventUrl)
    ) {
      return { url: href, label: m[2].replace(/<[^>]+>/g, "").trim() };
    }
  }

  return null;
}

/**
 * Fetches every available page, but only the ones that exist.
 */
async function fetchAllPages(): Promise<Record<string, unknown>[]> {
  const first = await fetch(`${SRMAP_API_BASE}&page=1`);
  if (!first.ok) throw new Error(`GET tribe_events page 1 -> ${first.status}`);

  const firstPage = (await first.json()) as Record<string, unknown>[];

  const reported = Number(first.headers.get("X-WP-TotalPages"));
  const totalPages = Number.isFinite(reported) && reported > 0
    ? reported
    : firstPage.length === PER_PAGE
      ? MAX_PAGES
      : 1;

  const extraPages = [];
  for (let page = 2; page <= Math.min(totalPages, MAX_PAGES); page++) {
    extraPages.push(fetch(`${SRMAP_API_BASE}&page=${page}`));
  }

  const rest = await Promise.all(extraPages);
  const parsed = await Promise.all(
    rest.filter((res) => res.ok).map((res) => res.json() as Promise<Record<string, unknown>[]>),
  );

  return [firstPage, ...parsed].flat();
}

/**
 * Fetches the single event web page to enrich venue, organizer and registration details.
 */
async function scrapeSingleEvent(link: string): Promise<{
  registrationUrl: string | null;
  registrationLabel: string | null;
  venue: string | null;
  organizer: string | null;
}> {
  try {
    const res = await fetch(link);
    if (!res.ok) return { registrationUrl: null, registrationLabel: null, venue: null, organizer: null };
    const html = await res.text();

    const reg = extractRegistrationLink(html, link);

    // Venue parsing from HTML
    let venue: string | null = null;
    const venueMatch = html.match(/class=["'][^"']*(?:tribe-events-venue-details|event_venue|tribe-venue)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p|dd)>/i);
    if (venueMatch) {
      venue = stripHtml(venueMatch[1]);
    }

    // Organizer parsing from HTML
    let organizer: string | null = null;
    const organizerMatch = html.match(/class=["'][^"']*(?:tribe-events-organizer|event_organizer|tribe-organizer)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p|dd)>/i);
    if (organizerMatch) {
      organizer = stripHtml(organizerMatch[1]);
    }

    return {
      registrationUrl: reg?.url ?? null,
      registrationLabel: reg?.label ?? null,
      venue,
      organizer,
    };
  } catch {
    return { registrationUrl: null, registrationLabel: null, venue: null, organizer: null };
  }
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
    const data = await fetchAllPages();
    const now = Date.now();

    const currentItems = data.filter((item) => {
      const startDate = (item.event_start_date as string) || (item.date as string);
      const endDate = (item.event_end_date as string) || startDate;
      return parseSRMAPDate(endDate) >= now - 7 * 24 * 60 * 60 * 1000;
    });

    if (currentItems.length === 0) {
      return json({ error: "SRMAP feed returned no current events; refusing to wipe cache" }, 502);
    }

    // Scrape rich fields concurrently with small batching
    const enrichedRows = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < currentItems.length; i += BATCH_SIZE) {
      const chunk = currentItems.slice(i, i + BATCH_SIZE);
      const enrichedChunk = await Promise.all(
        chunk.map(async (item) => {
          const startDate = (item.event_start_date as string) || (item.date as string);
          const endDate = (item.event_end_date as string) || startDate;
          const embedded = item._embedded as Record<string, unknown> | undefined;
          const link = item.link as string;
          const department = embedded ? extractDepartment(embedded) : "SRMAP";

          const rawContent = (item.content as { rendered: string })?.rendered ?? "";
          const scraped = await scrapeSingleEvent(link);

          return {
            id: item.id as number,
            title: stripHtml((item.title as { rendered: string }).rendered),
            excerpt: stripHtml((item.excerpt as { rendered: string }).rendered),
            content: rawContent,
            venue: scraped.venue,
            organizer: scraped.organizer || department,
            registration_url: scraped.registrationUrl,
            registration_label: scraped.registrationLabel,
            start_date: startDate,
            end_date: endDate,
            link,
            image_url: embedded ? extractImage(embedded) : null,
            department,
            event_type: embedded ? extractEventType(embedded) : "",
            last_synced_at: syncStartedAt,
          };
        }),
      );
      enrichedRows.push(...enrichedChunk);
    }

    const CHUNK = 200;
    for (let i = 0; i < enrichedRows.length; i += CHUNK) {
      const { error } = await supabaseAdmin
        .from("srmap_events_cache")
        .upsert(enrichedRows.slice(i, i + CHUNK), { onConflict: "id" });
      if (error) throw error;
    }

    // Prune stale records
    const { error: pruneError, count: pruned } = await supabaseAdmin
      .from("srmap_events_cache")
      .delete({ count: "exact" })
      .lt("last_synced_at", syncStartedAt);
    if (pruneError) throw pruneError;

    return json({ synced: enrichedRows.length, pruned: pruned ?? 0 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
