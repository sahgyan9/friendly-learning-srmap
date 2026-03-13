import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, ExternalLink, GraduationCap } from "lucide-react";
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
  const isUpcoming = now < start;

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
      : `${formattedStartDate} - ${formattedEndDate}`;

  return (
    <Card
      className={`overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col group border ${
        isLive
          ? "border-red-500/70 shadow-[0_0_0_2px_rgba(239,68,68,0.2)]"
          : "border-border hover:border-primary/30"
      }`}
    >
      {/* Top accent stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-red-600" />

      {/* Image or fallback */}
      <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 relative">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap className="h-14 w-14 text-orange-300 dark:text-orange-700" />
          </div>
        )}
        {/* Official badge overlay */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
            ● SRMAP Official
          </span>
        </div>

        {/* Real-time state badge */}
        <div className="absolute top-2 right-2">
          {isLive ? (
            <span className="relative inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              <span className="absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-300 opacity-80 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
              LIVE NOW
            </span>
          ) : isUpcoming ? (
            <span className="inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              UPCOMING
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              ENDED
            </span>
          )}
        </div>
      </div>

      <CardHeader className="pb-1 pt-3">
        <div className="flex flex-wrap gap-1 mb-1.5">
          {event.department && event.department !== "SRMAP" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-0">
              {event.department}
            </Badge>
          )}
          {event.eventType && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-700 dark:text-orange-400">
              {event.eventType}
            </Badge>
          )}
        </div>
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>
      </CardHeader>

      <CardContent className="flex-1 py-1">
        {event.excerpt && (
          <p className="text-xs text-muted-foreground line-clamp-2">{event.excerpt}</p>
        )}
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-2 pb-3 border-t border-border/50 mt-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formattedDate}</span>
        </div>
        <Button
          size="sm"
          className="h-7 text-xs px-3 bg-orange-600 hover:bg-orange-700 text-white"
          onClick={() => window.open(event.link, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          View Event
        </Button>
      </CardFooter>
    </Card>
  );
}
