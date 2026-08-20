import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, GraduationCap, ArrowRight, Sparkles, MapPin, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { getOptimizedImageUrl } from "@/lib/image/imageUrl";
import type { SRMAPEvent } from "@/hooks/useSRMAPEvents";

interface SRMAPEventCardProps {
  event: SRMAPEvent;
}

export function SRMAPEventCard({ event }: SRMAPEventCardProps) {
  const parseDate = (value: string) => new Date(value.replace(" ", "T") + "+05:30");
  const start = parseDate(event.startDate);
  const end = parseDate(event.endDate);
  const now = new Date();
  const isLive = now >= start && now <= end;
  const hasEnded = now > end;

  const [proxyFailed, setProxyFailed] = useState(false);
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

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg hover:border-violet-500/30",
        isLive && "ring-2 ring-violet-500/40",
        hasEnded && "opacity-70",
      )}
    >
      {/* Solid full-width accent border — violet for Events */}
      <CardAccentBorder gradient={isLive ? "violet" : hasEnded ? "muted" : "violet"} />

      {/* Hover glow — Events brand colour (violet) */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-violet-500/5 to-transparent" />

      {/* Cover image (links to event detail) */}
      <Link to={`/events/${event.id}`} className="relative block aspect-video w-full overflow-hidden bg-muted">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setProxyFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-500/10 to-violet-500/5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
              <GraduationCap className="h-7 w-7 text-violet-500/50" aria-hidden />
            </div>
          </div>
        )}

        {/* Status badges on image */}
        {isLive && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            Live now
          </span>
        )}
        {hasEnded && (
          <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
            Ended
          </span>
        )}

        {/* Registration available badge */}
        {event.registrationUrl && !hasEnded && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-violet-950/80 px-2 py-0.5 text-[10px] font-medium text-violet-200 backdrop-blur border border-violet-500/30">
            <Sparkles className="h-2.5 w-2.5" />
            Registration Open
          </span>
        )}
      </Link>

      {/* Header */}
      <CardHeader className="relative gap-2 pb-2 pt-4">
        {/* Department + type pills */}
        {(event.department !== "SRMAP" || event.eventType) && (
          <div className="flex flex-wrap gap-1.5">
            {event.department && event.department !== "SRMAP" && (
              <Badge
                variant="outline"
                className="text-[11px] font-medium bg-violet-500/8 text-violet-600 dark:text-violet-400 border-violet-500/20"
              >
                {event.department}
              </Badge>
            )}
            {event.eventType && (
              <Badge
                variant="outline"
                className="text-[11px] font-normal text-muted-foreground"
              >
                {event.eventType}
              </Badge>
            )}
          </div>
        )}

        <Link to={`/events/${event.id}`}>
          <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors duration-200 group-hover:text-violet-600 dark:group-hover:text-violet-400">
            {event.title}
          </h3>
        </Link>
      </CardHeader>

      {/* Excerpt */}
      <CardContent className="relative flex-1 pb-3 pt-0">
        {event.venue && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground/80 mb-2 truncate">
            <MapPin className="h-3 w-3 shrink-0 text-violet-500/70" />
            <span>{event.venue}</span>
          </p>
        )}
        {event.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {event.excerpt}
          </p>
        )}
      </CardContent>

      {/* Footer — date + Action CTA */}
      <CardFooter className="relative mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formattedDate}
        </span>

        {event.registrationUrl && !hasEnded ? (
          <a
            href={event.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold",
              "bg-violet-600 hover:bg-violet-700 text-white shadow-xs transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            Register
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <Link
            to={`/events/${event.id}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold",
              "text-violet-600 dark:text-violet-400 transition-all duration-200",
              "hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "group-hover:gap-2",
            )}
          >
            View details
            <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
