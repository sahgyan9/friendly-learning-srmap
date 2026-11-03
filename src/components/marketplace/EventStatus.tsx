import { cn } from "@/lib/utils";

type EventStatusTone = "live" | "open" | "ended" | "neutral";

const DOT_TONE: Record<EventStatusTone, string> = {
  live: "bg-emerald-500",
  open: "bg-primary",
  ended: "bg-muted-foreground/50",
  neutral: "bg-muted-foreground",
};

const TEXT_TONE: Record<EventStatusTone, string> = {
  live: "text-emerald-700 dark:text-emerald-400",
  open: "text-foreground",
  ended: "text-muted-foreground",
  neutral: "text-muted-foreground",
};

/**
 * Status is a state, not an action, so it reads as plain text with a dot
 * rather than a pill that looks pressable. Green is reserved for "live".
 */
export function EventStatus({
  tone,
  children,
  className,
}: {
  tone: EventStatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", TEXT_TONE[tone], className)}>
      <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONE[tone])} />
      {children}
    </span>
  );
}

/**
 * Fallback cover for events the upstream feed ships without an image. A
 * calendar-leaf date is the most useful thing to show in that space; a
 * centred placeholder icon only says "image missing".
 */
export function EventDateCover({
  start,
  eventType,
  className,
}: {
  start: Date;
  eventType?: string | null;
  className?: string;
}) {
  const month = start.toLocaleDateString("en-IN", { month: "short" });
  const weekday = start.toLocaleDateString("en-IN", { weekday: "long" });
  const day = start.getDate();

  return (
    <div className={cn("flex h-full w-full flex-col justify-between bg-secondary p-5", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-primary">{month}</span>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <span className="tabular block text-6xl font-semibold leading-none tracking-tight text-foreground">
            {day}
          </span>
          <span className="mt-2 block text-sm text-muted-foreground">{weekday}</span>
        </div>
        {eventType && (
          <span className="min-w-0 truncate text-right text-sm font-medium text-muted-foreground">
            {eventType}
          </span>
        )}
      </div>
    </div>
  );
}
