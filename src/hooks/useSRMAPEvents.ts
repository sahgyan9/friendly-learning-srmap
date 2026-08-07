import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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

interface CachedEventRow {
  id: number;
  title: string;
  excerpt: string;
  start_date: string;
  end_date: string;
  link: string;
  image_url: string | null;
  department: string;
  event_type: string;
}

/**
 * SRMAP's API returns "YYYY-MM-DD HH:mm:ss" in IST. Convert to a stable ISO
 * offset string.
 */
function parseSRMAPDate(value: string): number {
  return new Date(value.replace(" ", "T") + "+05:30").getTime();
}

function sortEvents(events: SRMAPEvent[]): SRMAPEvent[] {
  const now = Date.now();

  return [...events].sort((a, b) => {
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
}

/**
 * Reads SRMAP's events feed from public.srmap_events_cache instead of
 * calling events.srmap.edu.in directly from the browser.
 *
 * That WordPress site used to be hit live on every page load, which meant a
 * first-time visitor paid for a cold DNS+TLS handshake and an uncached REST
 * call before anything rendered -- worse than a returning visitor whose
 * browser already had a warm connection to that external host. The
 * sync-srmap-events edge function refreshes this table daily (see its pg_cron
 * schedule), so every visitor now reads this project's own Postgres and sees
 * the same, already-warm data.
 */
export function useSRMAPEvents() {
  const [events, setEvents] = useState<SRMAPEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEvents({ isRefresh = false } = {}) {
      try {
        if (!isRefresh) setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from("srmap_events_cache")
          .select("id, title, excerpt, start_date, end_date, link, image_url, department, event_type")
          .returns<CachedEventRow[]>();

        if (queryError) throw queryError;

        if (!cancelled) {
          const mapped: SRMAPEvent[] = sortEvents(
            (data ?? []).map((row) => ({
              id: row.id,
              title: row.title,
              excerpt: row.excerpt,
              date: row.start_date,
              startDate: row.start_date,
              endDate: row.end_date,
              link: row.link,
              imageUrl: row.image_url,
              department: row.department,
              eventType: row.event_type,
            })),
          );

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
    // The cache itself only changes once a day (see sync-srmap-events-daily),
    // so there is nothing to gain from polling more often than this -- it
    // just re-reads the same row a manual re-sync might have touched.
    const refreshTimer = window.setInterval(() => fetchEvents({ isRefresh: true }), 30 * 60 * 1000);
    return () => {
      window.clearInterval(refreshTimer);
      cancelled = true;
    };
  }, []);

  return { events, loading, error };
}
