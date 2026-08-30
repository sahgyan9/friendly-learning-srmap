import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  setEventAttendance,
  removeEventAttendance,
  type EventAttendanceStatus,
} from "@/integrations/supabase/services/event-attendees";

export type EventRSVPMap = Record<number, EventAttendanceStatus>;

/**
 * The signed-in student's RSVPs across every event, keyed by event id.
 *
 * The events page needs this for the whole list at once -- to pin "your
 * events" to the top and to render the quick RSVP buttons on each card --
 * so it reads the user's own rows in one query rather than calling
 * getEventAttendees() per card. No RPC needed: event_attendees grants
 * SELECT to authenticated and RLS lets a user read attendance rows.
 */
export function useEventRSVPs() {
  const { user } = useAuth();
  const [rsvps, setRsvps] = useState<EventRSVPMap>({});
  const [loading, setLoading] = useState(true);
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchRSVPs = useCallback(async () => {
    if (!user) {
      setRsvps({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        // event_attendees is not in the generated Database types yet; the
        // service layer casts the same way (services/event-attendees.ts).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("event_attendees" as any)
        .select("event_id, status")
        .eq("user_id", user.id);

      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        event_id: number;
        status: EventAttendanceStatus;
      }>;

      if (isMountedRef.current) {
        const map: EventRSVPMap = {};
        rows.forEach((row) => {
          map[Number(row.event_id)] = row.status;
        });
        setRsvps(map);
      }
    } catch (err) {
      console.error("Error fetching event RSVPs:", err);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRSVPs();
  }, [fetchRSVPs]);

  /**
   * Set, switch, or clear the RSVP for one event. Clicking the status the
   * user already has clears it, so the same pair of buttons is both the
   * control and the toggle.
   *
   * Optimistic: the card flips immediately and reverts if the write fails.
   */
  const toggleRSVP = useCallback(
    async (eventId: number, status: EventAttendanceStatus) => {
      if (!user) {
        toast.error("Sign in required", {
          description: "Please sign in with your SRM AP account to RSVP.",
        });
        return;
      }

      const previous = rsvps[eventId] ?? null;
      const isClearing = previous === status;

      setPendingEventId(eventId);
      setRsvps((prev) => {
        const next = { ...prev };
        if (isClearing) {
          delete next[eventId];
        } else {
          next[eventId] = status;
        }
        return next;
      });

      const { error } = isClearing
        ? await removeEventAttendance(eventId)
        : await setEventAttendance({ eventId, status });

      if (!isMountedRef.current) return;
      setPendingEventId(null);

      if (error) {
        // Put the previous state back -- the row on the server never changed.
        setRsvps((prev) => {
          const next = { ...prev };
          if (previous) {
            next[eventId] = previous;
          } else {
            delete next[eventId];
          }
          return next;
        });
        toast.error("RSVP failed", { description: error.message });
        return;
      }

      if (isClearing) {
        toast.success("RSVP removed");
      } else {
        toast.success(
          status === "going" ? "You're marked as Going!" : "You're marked as Interested!",
          { description: "Peers can now see you're attending." },
        );
      }
    },
    [rsvps, user],
  );

  return { rsvps, loading, pendingEventId, toggleRSVP, refetch: fetchRSVPs };
}
