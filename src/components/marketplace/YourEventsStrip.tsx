import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarCheck, Star, Check, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SRMAPEvent } from "@/hooks/useSRMAPEvents";
import type { EventAttendanceStatus } from "@/integrations/supabase/services/event-attendees";

interface YourEventsStripProps {
  /** Live or upcoming events the student has RSVP'd to, soonest first. */
  events: SRMAPEvent[];
  rsvps: Record<number, EventAttendanceStatus>;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(value: string) {
  return new Date(value.replace(" ", "T") + "+05:30");
}

/**
 * "Live now", "Today · 3:00 PM", "Tomorrow · 9:00 AM", "In 5 days · 4 Sep".
 *
 * Day distance is measured between calendar days in IST, not by dividing the
 * millisecond gap -- an event at 9am tomorrow is 18 hours away but is still
 * "Tomorrow", and one 30 hours away can be the day after.
 */
function formatCountdown(event: SRMAPEvent, now: Date = new Date()): string {
  const start = parseDate(event.startDate);
  const end = parseDate(event.endDate);

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
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      aria-label="Your events"
      className="mb-6 rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 via-background to-background p-4"
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight">
          <CalendarCheck className="h-4 w-4 text-violet-500" aria-hidden />
          Your Events
        </h2>

        {goingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-700 dark:text-emerald-400">
            <Check className="h-3 w-3" aria-hidden />
            {goingCount} Going
          </span>
        )}
        {interestedCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-2xs font-semibold text-amber-700 dark:text-amber-400">
            <Star className="h-3 w-3" aria-hidden />
            {interestedCount} Interested
          </span>
        )}
      </div>

      <ul className="flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-3">
        {events.slice(0, 6).map((event) => {
          const status = rsvps[event.id];
          const countdown = formatCountdown(event);

          return (
            <li key={event.id} className="w-[15rem] shrink-0 snap-start sm:w-auto">
              <Link
                to={`/events/${event.id}`}
                className={cn(
                  "group flex h-full flex-col justify-between gap-2 rounded-lg border bg-background/70 p-3 transition-colors",
                  "hover:border-violet-500/40 hover:bg-background",
                  status === "going" ? "border-emerald-500/30" : "border-amber-500/30",
                )}
              >
                <span className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400">
                  {event.title}
                </span>

                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      countdown === "Live now"
                        ? "text-violet-600 dark:text-violet-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {countdown}
                  </span>
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}
