import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, GraduationCap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
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

  const formattedStartDate = start.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedEndDate = end.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
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

      {/* Cover image */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* Styled fallback — violet tint matching Events colour */
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-violet-500/10 to-violet-500/5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
              <GraduationCap className="h-7 w-7 text-violet-500/50" aria-hidden />
            </div>
          </div>
        )}

        {/* Status badges on image — only exceptions get called out */}
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
      </div>

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

        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors duration-200 group-hover:text-violet-600 dark:group-hover:text-violet-400">
          {event.title}
        </h3>
      </CardHeader>

      {/* Excerpt */}
      <CardContent className="relative flex-1 pb-3 pt-0">
        {event.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {event.excerpt}
          </p>
        )}
      </CardContent>

      {/* Footer — date + CTA */}
      <CardFooter className="relative mt-auto flex items-center justify-between gap-3 border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {formattedDate}
        </span>

        {/* An anchor, not a button calling window.open — this navigates, so it
            should be middle-clickable, show its target on hover, and be
            announced as a link. */}
        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold",
            "text-violet-600 dark:text-violet-400 transition-all duration-200",
            "hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "group-hover:gap-2",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          View event
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </CardFooter>
    </Card>
  );
}
