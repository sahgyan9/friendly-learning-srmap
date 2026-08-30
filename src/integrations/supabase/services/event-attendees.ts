import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";

export type EventAttendanceStatus = "going" | "interested";

export type EventAttendee = {
  user_id: string;
  name: string;
  profile_image: string | null;
  department: string | null;
  role: string | null;
  is_mentor: boolean;
  status: EventAttendanceStatus;
  note: string | null;
  created_at: string;
};

export type EventAttendanceSummary = {
  eventId: number;
  goingCount: number;
  interestedCount: number;
  totalCount: number;
};

/**
 * Fetch all attendees for an event along with the active user's attendance status.
 */
export async function getEventAttendees(eventId: number) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const currentUserId = auth.user?.id || null;

    // Call the SECURITY DEFINER RPC to safely get attendee profiles
    // @ts-expect-error RPC typing may lag until types.ts is refreshed
    const { data, error } = await supabase.rpc("get_event_attendees", {
      p_event_id: eventId,
    });

    if (error) {
      console.error("Error fetching event attendees:", error);
      return { data: [] as EventAttendee[], myAttendance: null, error };
    }

    const attendees = (data || []) as EventAttendee[];
    const myAttendance = currentUserId
      ? attendees.find((a) => a.user_id === currentUserId) || null
      : null;

    return { data: attendees, myAttendance, error: null };
  } catch (err) {
    console.error("Exception in getEventAttendees:", err);
    return { data: [] as EventAttendee[], myAttendance: null, error: err as Error };
  }
}

/**
 * Get attendance counts for multiple events in a single batch.
 */
export async function getEventAttendanceCounts(eventIds: number[]) {
  if (!eventIds.length) return { data: {}, error: null };

  try {
    // @ts-expect-error RPC typing
    const { data, error } = await supabase.rpc("get_event_attendance_counts", {
      p_event_ids: eventIds,
    });

    if (error) {
      console.error("Error fetching event attendance counts:", error);
      return { data: {}, error };
    }

    const countsMap: Record<number, EventAttendanceSummary> = {};
    const rows = (Array.isArray(data) ? data : []) as unknown as Array<{
      event_id: number;
      going_count: number;
      interested_count: number;
      total_count: number;
    }>;
    rows.forEach((row) => {
      countsMap[row.event_id] = {
        eventId: Number(row.event_id),
        goingCount: Number(row.going_count || 0),
        interestedCount: Number(row.interested_count || 0),
        totalCount: Number(row.total_count || 0),
      };
    });

    return { data: countsMap, error: null };
  } catch (err) {
    console.error("Exception in getEventAttendanceCounts:", err);
    return { data: {}, error: err as Error };
  }
}

/**
 * Set or update the current user's attendance status for an event.
 */
export async function setEventAttendance({
  eventId,
  status,
  note,
}: {
  eventId: number;
  status: EventAttendanceStatus;
  note?: string | null;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return { error: new Error("Sign in with your SRM AP email to RSVP.") };
    }

    const sanitizedNote = note?.trim() ? sanitizeInput(note.trim(), 150) : null;

    const { error } = await supabase
      .from("event_attendees" as any)
      .upsert(
        {
          event_id: eventId,
          user_id: auth.user.id,
          status,
          note: sanitizedNote,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id,user_id" }
      );

    if (error) {
      console.error("Error setting event attendance:", error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error("Exception in setEventAttendance:", err);
    return { error: err as Error };
  }
}

/**
 * Remove/Cancel the current user's attendance for an event.
 */
export async function removeEventAttendance(eventId: number) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return { error: new Error("Not signed in.") };
    }

    const { error } = await supabase
      .from("event_attendees" as any)
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("Error removing event attendance:", error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error("Exception in removeEventAttendance:", err);
    return { error: err as Error };
  }
}
