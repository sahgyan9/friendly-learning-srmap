import { useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, MapPin, ExternalLink, Share2, Check, Star, Loader2, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";
import { EventShareModal } from "@/components/events/EventShareModal";
import { EventDateCover, EventStatus } from "@/components/marketplace/EventStatus";
import { parseEventDate } from "@/lib/calendar-utils";
import type { SRMAPEvent } from "@/hooks/useSRMAPEvents";
import type { EventAttendanceStatus } from "@/integrations/supabase/services/event-attendees";

interface SRMAPEventCardProps {
  event: SRMAPEvent;
  /** The signed-in student's RSVP for this event, if any. */
  rsvpStatus?: EventAttendanceStatus | null;
  /**
   * Passing this turns on the quick RSVP buttons. Omitted (as on the related
   * events rail in EventDetail) to keep the card compact.
   */
  onRsvp?: (eventId: number, status: EventAttendanceStatus) => void;
  rsvpPending?: boolean;
}

export function SRMAPEventCard({ event, rsvpStatus = null, onRsvp, rsvpPending = false }: SRMAPEventCardProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const start = parseEventDate(event.startDate);
  const end = parseEventDate(event.endDate);
  const now = new Date();
  const isLive = now >= start && now <= end;
  const hasEnded = now > end;
  const registrationOpen = Boolean(event.registrationUrl) && !hasEnded;

  const [proxyFailed, setProxyFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageSrc = event.imageUrl
    ? proxyFailed
      ? event.imageUrl
      : getOptimizedImageUrl(event.imageUrl, { width: 640, quality: 75 })
    : null;

  const formattedStartDate = start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedEndDate = end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedDate =
    formattedStartDate === formattedEndDate
      ? formattedStartDate
      : `${formattedStartDate} – ${formattedEndDate}`;

  const showDepartment = Boolean(event.department) && event.department !== "SRMAP";

  const rsvpButton = (status: EventAttendanceStatus, label: string) => {
    const selected = rsvpStatus === status;
    const Icon = status === "going" ? Check : Star;
    return (
      <button
        type="button"
        disabled={rsvpPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRsvp?.(event.id, status);
        }}
        aria-pressed={selected}
        title={selected ? `Marked ${label.toLowerCase()}. Select again to remove.` : undefined}
        className={cn(
          "inline-flex h-10 flex-1 items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-150",
          "focus-visible:relative focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-wait",
          selected
            ? status === "going"
              ? "bg-emerald-600 text-white hover:bg-emerald-600/90"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-card text-foreground hover:bg-accent",
        )}
      >
        {rsvpPending && selected ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Icon className={cn("h-4 w-4", selected && status === "interested" && "fill-current")} aria-hidden />
        )}
        {label}
      </button>
    );
  };

  return (
    <article
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-card",
        "transition-colors duration-150 hover:border-foreground/20",
        // The student's own RSVP is the signal they scan a full grid for, so
        // it gets the border; going = confirmed (green), interested = selected (blue).
        rsvpStatus === "going" && "border-emerald-600/40 hover:border-emerald-600/60",
        rsvpStatus === "interested" && "border-primary/40 hover:border-primary/60",
      )}
    >
      <Link
        to={`/events/${event.id}`}
        tabIndex={-1}
        aria-hidden
        className={cn("relative block aspect-video w-full overflow-hidden border-b bg-muted", hasEnded && "opacity-70")}
      >
        {imageSrc ? (
          <>
            <img
              src={imageSrc}
              alt=""
              className={cn(
                "h-full w-full object-cover transition-opacity duration-300",
                imageLoaded ? "opacity-100" : "opacity-0",
              )}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setProxyFailed(true)}
            />
            {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-muted-foreground/10" />}
          </>
        ) : (
          <EventDateCover start={start} eventType={event.eventType} />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {(isLive || hasEnded || registrationOpen || showDepartment) && (
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {isLive ? (
              <EventStatus tone="live">Live now</EventStatus>
            ) : hasEnded ? (
              <EventStatus tone="ended">Ended</EventStatus>
            ) : registrationOpen ? (
              <EventStatus tone="open">Registration open</EventStatus>
            ) : null}
            {showDepartment && (
              <span className="min-w-0 truncate text-xs text-muted-foreground">{event.department}</span>
            )}
          </div>
        )}

        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight">
          <Link
            to={`/events/${event.id}`}
            className="transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:underline"
          >
            {event.title}
          </Link>
        </h3>

        <dl className="flex min-w-0 flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex min-w-0 items-center gap-2">
            <dt className="sr-only">Date</dt>
            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
            <dd className="tabular truncate">{formattedDate}</dd>
          </div>
          {event.venue && (
            <div className="flex min-w-0 items-center gap-2">
              <dt className="sr-only">Venue</dt>
              <MapPin className="h-4 w-4 shrink-0" aria-hidden />
              <dd className="truncate">{event.venue}</dd>
            </div>
          )}
        </dl>

        {event.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{event.excerpt}</p>
        )}

        {/* Quick RSVP — only on surfaces that pass a handler (the events page) */}
        {onRsvp && !hasEnded && (
          <div className="mt-auto flex flex-col gap-2 pt-1">
            <div
              role="group"
              aria-label="Your RSVP"
              className="flex divide-x overflow-hidden rounded-md border"
            >
              {rsvpButton("going", "Going")}
              {rsvpButton("interested", "Interested")}
            </div>
            {rsvpStatus && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Bell className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Reminders 24 h and 2 h before
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t px-5 py-3">
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "-ml-2 text-muted-foreground")}
          aria-label="Share event"
          title="Share event"
        >
          <Share2 className="h-4 w-4" />
        </button>

        {registrationOpen ? (
          <a
            href={event.registrationUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm" })}
          >
            Register
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : (
          <Link to={`/events/${event.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2")}>
            View event
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>

      <EventShareModal
        event={event}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </article>
  );
}
