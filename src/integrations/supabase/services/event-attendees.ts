import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput } from "@/utils/input-sanitization";
import { createNotification } from "@/integrations/supabase/services/notifications";
import { parseEventDate } from "@/lib/calendar-utils";

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

function formatEventDateSnippet(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = parseEventDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export type SetEventAttendanceParams = {
  eventId: number;
  status: EventAttendanceStatus;
  note?: string | null;
  eventTitle?: string;
  eventStartDate?: string;
  eventVenue?: string | null;
};

/**
 * Set or update the current user's attendance status for an event.
 * Creates an in-app confirmation notification (and dispatches Web Push).
 */
export async function setEventAttendance({
  eventId,
  status,
  note,
  eventTitle,
  eventStartDate,
  eventVenue,
}: SetEventAttendanceParams) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return { error: new Error("Sign in with your SRM AP email to RSVP.") };
    }

    const sanitizedNote = note?.trim() ? sanitizeInput(note.trim(), 150) : null;

    const { error } = await supabase
      .from("event_attendees")
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

    // Lookup event details if not provided by caller
    let title = eventTitle || "";
    let startDate = eventStartDate || "";
    let venue = eventVenue || "";

    if (!title) {
      const { data: eventRow } = await supabase
        .from("srmap_events_cache")
        .select("title, start_date, venue")
        .eq("id", eventId)
        .maybeSingle();

      if (eventRow) {
        title = eventRow.title || `Event #${eventId}`;
        startDate = eventRow.start_date || "";
        venue = eventRow.venue || "";
      } else {
        title = `Event #${eventId}`;
      }
    }

    // Send in-app confirmation & trigger push notification
    try {
      const statusLabel = status === "going" ? "Going" : "Interested";
      const dateSnippet = formatEventDateSnippet(startDate);
      const venueSnippet = venue?.trim() ? ` at ${venue.trim()}` : "";
      const timingSnippet = dateSnippet ? ` (${dateSnippet})` : "";

      const notifTitle = `RSVP Confirmed: ${title}`;
      const notifContent = `You are marked as ${statusLabel} for "${title}"${timingSnippet}${venueSnippet}. We'll remind you before it begins.`;

      // Check if we recently sent an RSVP confirmation for this event to avoid spamming on status toggles
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentNotifs } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", auth.user.id)
        .eq("type", "event_alert")
        .gte("created_at", oneHourAgo);

      const alreadyHasRecent = (recentNotifs || []).length > 3;

      if (!alreadyHasRecent) {
        await createNotification({
          user_id: auth.user.id,
          type: "event_alert",
          title: notifTitle,
          content: notifContent,
          data: {
            event_id: eventId,
            url: `/events/${eventId}`,
            status,
            type: "event_rsvp_confirmed",
          },
          read: false,
        });
      }
    } catch (notifErr) {
      console.warn("Non-fatal error creating event RSVP confirmation notification:", notifErr);
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
      .from("event_attendees")
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

/**
 * Dispatches upcoming event reminders for the current student if any are due.
 * Acts as an active client-side safety net when visiting events surfaces.
 */
export async function checkMyUpcomingEventReminders() {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { reminders: [], error: null };

    const { data, error } = await supabase.rpc("dispatch_upcoming_event_reminders", {
      p_user_id: auth.user.id,
    });

    if (error) {
      console.warn("Could not check upcoming event reminders:", error);
      return { reminders: [], error };
    }

    return { reminders: data || [], error: null };
  } catch (err) {
    console.warn("Exception checking upcoming event reminders:", err);
    return { reminders: [], error: err as Error };
  }
}

export type UserEventScheduleItem = {
  event_id: number;
  title: string;
  start_date: string;
  end_date: string;
  event_type: string;
  department: string;
  link: string;
  image_url: string | null;
  status: EventAttendanceStatus;
  note: string | null;
  is_happening_now: boolean;
  is_all_day: boolean;
};

/**
 * Fetch all upcoming and ongoing events RSVP'd by a student/mentor.
 */
export async function getUserEventSchedule(userId: string) {
  try {
    const { data, error } = await supabase.rpc("get_user_event_schedule", {
      p_user_id: userId,
    });

    if (error) {
      console.error("Error fetching user event schedule:", error);
      return { data: [] as UserEventScheduleItem[], error };
    }

    return { data: (data as unknown as UserEventScheduleItem[]) || [], error: null };
  } catch (err) {
    console.error("Exception in getUserEventSchedule:", err);
    return { data: [] as UserEventScheduleItem[], error: err as Error };
  }
}
