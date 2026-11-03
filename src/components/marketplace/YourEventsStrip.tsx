import { Link } from "react-router-dom";
import { CalendarCheck, Star, Check, Bell } from "lucide-react";
import { EventStatus } from "@/components/marketplace/EventStatus";

import { cn } from "@/lib/utils";
import type { SRMAPEvent } from "@/hooks/useSRMAPEvents";
import type { EventAttendanceStatus } from "@/integrations/supabase/services/event-attendees";

import { parseEventDate } from "@/lib/calendar-utils";

interface YourEventsStripProps {
  /** Live or upcoming events the student has RSVP'd to, soonest first. */
  events: SRMAPEvent[];
  rsvps: Record<number, EventAttendanceStatus>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * "Live now", "Today · 3:00 PM", "Tomorrow · 9:00 AM", "In 5 days · 4 Sep".
 *
 * Day distance is measured between calendar days in IST, not by dividing the
 * millisecond gap -- an event at 9am tomorrow is 18 hours away but is still
 * "Tomorrow", and one 30 hours away can be the day after.
 */
function formatCountdown(event: SRMAPEvent, now: Date = new Date()): string {
  const start = parseEventDate(event.startDate);
  const end = parseEventDate(event.endDate);

  if (now >= start && now <= end) return "Live now";

  const startOfDay = (d: Date) => {
    const ist = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    ist.setHours(0, 0, 0, 0);
    return ist.getTime();
  };

  const dayGap = Math.round((startOfDay(start) - startOfDay(now)) / MS_PER_DAY);
  const time = start.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const day = start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

  if (dayGap <= 0) return `Today · ${time}`;
  if (dayGap === 1) return `Tomorrow · ${time}`;
  if (dayGap <= 7) return `In ${dayGap} days · ${day}`;
  return day;
}

/**
 * The pinned strip at the top of /events. Answers "what did I say yes to, and
 * when is it?" without the student scanning the grid for their own cards.
 */
export function YourEventsStrip({ events, rsvps }: YourEventsStripProps) {
  if (events.length === 0) return null;

  const goingCount = events.filter((e) => rsvps[e.id] === "going").length;
  const interestedCount = events.filter((e) => rsvps[e.id] === "interested").length;

  return (
    <section aria-label="Your events" className="animate-fade-up rounded-lg border bg-card p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CalendarCheck className="h-4 w-4 text-primary" aria-hidden />
            Your events
          </h2>
          <span className="tabular text-xs text-muted-foreground">
            {[goingCount > 0 && `${goingCount} going`, interestedCount > 0 && `${interestedCount} interested`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Bell className="h-3.5 w-3.5" aria-hidden />
          Reminders on
        </span>
      </div>

      <ul className="flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {events.slice(0, 6).map((event) => {
          const status = rsvps[event.id];
          const countdown = formatCountdown(event);
          const live = countdown === "Live now";

          return (
            <li key={event.id} className="w-[15rem] shrink-0 snap-start sm:w-auto">
              <Link
                to={`/events/${event.id}`}
                className="group flex h-full flex-col justify-between gap-2 rounded-md border bg-background p-3 transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
              >
                <span className="line-clamp-2 text-sm font-medium leading-snug">{event.title}</span>

                <span className="flex items-center justify-between gap-2">
                  {live ? (
                    <EventStatus tone="live">Live now</EventStatus>
                  ) : (
                    <span className="tabular text-xs text-muted-foreground">{countdown}</span>
                  )}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      status === "going" ? "text-emerald-700 dark:text-emerald-400" : "text-primary",
                    )}
                  >
                    {status === "going" ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Star className="h-3.5 w-3.5 fill-current" aria-hidden />}
                    {status === "going" ? "Going" : "Interested"}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
