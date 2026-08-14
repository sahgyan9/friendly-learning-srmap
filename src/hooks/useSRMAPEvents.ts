import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SRMAPEvent {
  id: number;
  title: string;
  excerpt: string;
  content?: string;
  venue?: string | null;
  organizer?: string | null;
  registrationUrl?: string | null;
  registrationLabel?: string | null;
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
  content?: string | null;
  venue?: string | null;
  organizer?: string | null;
  registration_url?: string | null;
  registration_label?: string | null;
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

function mapRowToEvent(row: CachedEventRow): SRMAPEvent {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content || "",
    venue: row.venue || null,
    organizer: row.organizer || null,
    registrationUrl: row.registration_url || null,
    registrationLabel: row.registration_label || null,
    date: row.start_date,
    startDate: row.start_date,
    endDate: row.end_date,
    link: row.link,
    imageUrl: row.image_url,
    department: row.department,
    eventType: row.event_type,
  };
}

/**
 * Reads SRMAP's events feed from public.srmap_events_cache instead of
 * calling events.srmap.edu.in directly from the browser.
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
          .select("id, title, excerpt, content, venue, organizer, registration_url, registration_label, start_date, end_date, link, image_url, department, event_type")
          .returns<CachedEventRow[]>();

        if (queryError) throw queryError;

        if (!cancelled) {
          const mapped: SRMAPEvent[] = sortEvents(
            (data ?? []).map(mapRowToEvent),
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
    const refreshTimer = window.setInterval(() => fetchEvents({ isRefresh: true }), 30 * 60 * 1000);
    return () => {
      window.clearInterval(refreshTimer);
      cancelled = true;
    };
  }, []);

  return { events, loading, error };
}

/**
 * Fetches a single event by its ID from the local cache.
 */
export function useSRMAPEvent(id: string | number | undefined) {
  const [event, setEvent] = useState<SRMAPEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const numericId = Number(id);

    async function fetchEvent() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from("srmap_events_cache")
          .select("id, title, excerpt, content, venue, organizer, registration_url, registration_label, start_date, end_date, link, image_url, department, event_type")
          .eq("id", numericId)
          .maybeSingle();

        if (queryError) throw queryError;

        if (!cancelled) {
          if (data) {
            setEvent(mapRowToEvent(data as CachedEventRow));
          } else {
            setEvent(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load event details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEvent();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { event, loading, error };
}
