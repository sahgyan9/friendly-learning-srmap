import { useState, useEffect } from "react";

export interface SRMAPEvent {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  startDate: string;
  endDate: string;
  link: string;
  imageUrl: string | null;
  department: string;
  eventType: string;
}

const PER_PAGE = 100;
const MAX_PAGES = 3;

const SRMAP_API_BASE =
  `https://events.srmap.edu.in/wp-json/wp/v2/tribe_events?per_page=${PER_PAGE}&_embed=1&order=desc`;

/**
 * Fetches every available page, but only the ones that exist.
 *
 * Pages 1-3 were previously requested unconditionally. The feed currently fits
 * on one page, so two of those three requests returned
 * `rest_post_invalid_page_number` 400s on every load — and again on every
 * 60-second refresh. WordPress reports the real count in `X-WP-TotalPages`.
 */
async function fetchAllPages(): Promise<Record<string, unknown>[]> {
  const first = await fetch(`${SRMAP_API_BASE}&page=1`);
  if (!first.ok) throw new Error("Unable to fetch SRMAP events");

  const firstPage = (await first.json()) as Record<string, unknown>[];

  // The header is normally exposed via CORS; if a proxy strips it, fall back to
  // "a full page probably means there is another one".
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

function parseSRMAPDate(value: string): number {
  // SRMAP API returns "YYYY-MM-DD HH:mm:ss" in IST. Convert to a stable ISO offset string.
  return new Date(value.replace(" ", "T") + "+05:30").getTime();
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

/**
 * WordPress returns titles and excerpts with entities already encoded, so
 * stripping tags alone left `&#8211;`, `&#8220;` and `&amp;` rendering
 * literally on every event card. Decoded here rather than with
 * `dangerouslySetInnerHTML`, which would hand an external feed the ability to
 * inject markup into the page.
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

function extractDepartment(embedded: Record<string, unknown>): string {
  try {
    const terms = embedded["wp:term"] as unknown[][];
    for (const termGroup of terms) {
      for (const term of termGroup as Array<{ taxonomy: string; name: string }>) {
        if (term.taxonomy === "tribe_events_cat") {
          return term.name;
        }
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
        if (term.taxonomy === "cust_event_sub_menu") {
          return term.name;
        }
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

export function useSRMAPEvents() {
  const [events, setEvents] = useState<SRMAPEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents({ isRefresh = false } = {}) {
      try {
        // A background refresh must not tear the list down and show a spinner
        // in place of content the reader is part-way through.
        if (!isRefresh) setLoading(true);
        setError(null);

        const data = await fetchAllPages();

        if (!cancelled) {
          const now = Date.now();
          const mapped: SRMAPEvent[] = data
            .map((item) => {
              const startDate = (item.event_start_date as string) || (item.date as string);
              const endDate = (item.event_end_date as string) || startDate;

              return {
                id: item.id as number,
                title: stripHtml((item.title as { rendered: string }).rendered),
                excerpt: stripHtml((item.excerpt as { rendered: string }).rendered),
                date: startDate,
                startDate,
                endDate,
                link: item.link as string,
                imageUrl: item._embedded
                  ? extractImage(item._embedded as Record<string, unknown>)
                  : null,
                department: item._embedded
                  ? extractDepartment(item._embedded as Record<string, unknown>)
                  : "SRMAP",
                eventType: item._embedded
                  ? extractEventType(item._embedded as Record<string, unknown>)
                  : "",
              };
            })
            .filter((item) => parseSRMAPDate(item.endDate) >= now - 7 * 24 * 60 * 60 * 1000)
            .sort((a, b) => {
              const aStart = parseSRMAPDate(a.startDate);
              const bStart = parseSRMAPDate(b.startDate);
              const aEnd = parseSRMAPDate(a.endDate);
              const bEnd = parseSRMAPDate(b.endDate);
              const aLive = now >= aStart && now <= aEnd;
              const bLive = now >= bStart && now <= bEnd;

              if (aLive && !bLive) return -1;
              if (!aLive && bLive) return 1;

              const aUpcoming = aStart > now;
              const bUpcoming = bStart > now;
              if (aUpcoming && !bUpcoming) return -1;
              if (!aUpcoming && bUpcoming) return 1;

              if (aUpcoming && bUpcoming) {
                return aStart - bStart;
              }

              // Both are past events: show most recent first.
              if (!aLive && !bLive && !aUpcoming && !bUpcoming) {
                return bStart - aStart;
              }

              return aStart - bStart;
            });

          setEvents(mapped);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load university events. Please try again later.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvents();
    // University events change a few times a week, not a few times an hour.
    // Re-pulling a fully embedded feed every 60s was pure waste.
    const refreshTimer = window.setInterval(() => fetchEvents({ isRefresh: true }), 5 * 60 * 1000);
    return () => {
      window.clearInterval(refreshTimer);
      cancelled = true;
    };
  }, []);

  return { events, loading, error };
}
