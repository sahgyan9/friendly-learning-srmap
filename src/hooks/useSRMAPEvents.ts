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

const SRMAP_API_BASE =
  "https://events.srmap.edu.in/wp-json/wp/v2/tribe_events?per_page=100&_embed=1&order=desc";

function parseSRMAPDate(value: string): number {
  // SRMAP API returns "YYYY-MM-DD HH:mm:ss" in IST. Convert to a stable ISO offset string.
  return new Date(value.replace(" ", "T") + "+05:30").getTime();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
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

    async function fetchEvents() {
      try {
        setLoading(true);
        setError(null);
        const responses = await Promise.all([
          fetch(`${SRMAP_API_BASE}&page=1`),
          fetch(`${SRMAP_API_BASE}&page=2`),
          fetch(`${SRMAP_API_BASE}&page=3`),
        ]);

        const okResponses = responses.filter((res) => res.ok);
        if (okResponses.length === 0) {
          throw new Error("Unable to fetch SRMAP events");
        }

        const pages = await Promise.all(okResponses.map((res) => res.json()));
        const data = pages.flat() as Record<string, unknown>[];

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
    const refreshTimer = window.setInterval(fetchEvents, 60000);
    return () => {
      window.clearInterval(refreshTimer);
      cancelled = true;
    };
  }, []);

  return { events, loading, error };
}
