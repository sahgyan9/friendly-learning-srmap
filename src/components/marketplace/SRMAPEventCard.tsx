import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
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
        "group flex flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg",
        isLive && "ring-2 ring-rose-500/40",
        hasEnded && "opacity-75",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40" aria-hidden />
          </div>
        )}

        {/* Only the exceptions are called out. "Upcoming" described almost
            every card, and the date below already says so — a badge on
            everything carries no information. The same was true of the
            "SRMAP Official" tag, which sat on all of them. */}
        {isLive && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow">
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

      <CardHeader className="gap-2 pb-2 pt-4">
        {(event.department !== "SRMAP" || event.eventType) && (
          <div className="flex flex-wrap gap-1.5">
            {event.department && event.department !== "SRMAP" && (
              <Badge variant="secondary" className="text-[11px] font-normal">
                {event.department}
              </Badge>
            )}
            {event.eventType && (
              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
                {event.eventType}
              </Badge>
            )}
          </div>
        )}

        <h3 className="line-clamp-2 text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {event.title}
        </h3>
      </CardHeader>

      <CardContent className="flex-1 pb-3 pt-0">
        {event.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{event.excerpt}</p>
        )}
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t pt-3">
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View event
          <ExternalLink className="h-3 w-3" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </CardFooter>
    </Card>
  );
}
