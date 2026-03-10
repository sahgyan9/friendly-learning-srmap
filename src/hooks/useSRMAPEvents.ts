import { useState, useEffect } from "react";

export interface SRMAPEvent {
  id: number;
  title: string;
  excerpt: string;
  date: string;
  link: string;
  imageUrl: string | null;
  department: string;
  eventType: string;
}

const SRMAP_API =
  "https://events.srmap.edu.in/wp-json/wp/v2/tribe_events?per_page=20&_embed=1&order=desc";

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
        const res = await fetch(SRMAP_API);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (!cancelled) {
          const mapped: SRMAPEvent[] = (data as Record<string, unknown>[]).map((item) => ({
            id: item.id as number,
            title: stripHtml((item.title as { rendered: string }).rendered),
            excerpt: stripHtml((item.excerpt as { rendered: string }).rendered),
            date: item.date as string,
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
          }));
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
    return () => {
      cancelled = true;
    };
  }, []);

  return { events, loading, error };
}
