import { useMemo } from "react";
import { Clock, MapPin, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { TimetableSlot } from "./WeeklyMatrixTable";

interface ActiveScheduleBannerProps {
  slots: TimetableSlot[];
}

export default function ActiveScheduleBanner({ slots }: ActiveScheduleBannerProps) {
  const scheduleStatus = useMemo(() => {
    if (!slots || slots.length === 0) return null;

    try {
      const now = new Date();
      const istOptions: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };
      const currentDayName = new Intl.DateTimeFormat("en-US", { ...istOptions, weekday: "long" }).format(now);
      const currentTimeStr = new Intl.DateTimeFormat("en-GB", {
        ...istOptions,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now);

      const todaySlots = slots
        .filter((s) => s.day_name.toLowerCase() === currentDayName.toLowerCase())
        .sort((a, b) => a.start_time.localeCompare(b.start_time));

      if (todaySlots.length === 0) {
        return {
          type: "free_day" as const,
          message: `No classes scheduled today (${currentDayName}).`,
        };
      }

      // Check for current class
      const currentClass = todaySlots.find(
        (s) => currentTimeStr >= s.start_time && currentTimeStr <= s.end_time
      );

      if (currentClass) {
        return {
          type: "ongoing" as const,
          slot: currentClass,
          endTime: currentClass.end_time.slice(0, 5),
        };
      }

      // Check for next upcoming class today
      const upcomingClass = todaySlots.find((s) => s.start_time > currentTimeStr);
      if (upcomingClass) {
        return {
          type: "upcoming" as const,
          slot: upcomingClass,
          startTime: upcomingClass.start_time.slice(0, 5),
        };
      }

      return {
        type: "done_for_day" as const,
        message: "All scheduled classes completed for today.",
      };
    } catch (err) {
      console.warn("Failed to compute active schedule status:", err);
      return null;
    }
  }, [slots]);

  if (!scheduleStatus) return null;

  if (scheduleStatus.type === "ongoing" && scheduleStatus.slot) {
    const s = scheduleStatus.slot;
    return (
      <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-foreground shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <span>Class in Session</span>
                <span className="text-muted-foreground">•</span>
                <span>Ends at {scheduleStatus.endTime}</span>
              </div>
              <h4 className="text-base font-bold text-foreground mt-0.5">
                {s.course_code}: {s.course_name}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.faculty_name ? `Instructor: ${s.faculty_name}` : "Faculty scheduled"}
              </p>
            </div>
          </div>
          {s.room_number && (
            <div className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-background/80 border border-emerald-500/30 flex items-center gap-1.5 text-sm font-mono font-semibold">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Room {s.room_number}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (scheduleStatus.type === "upcoming" && scheduleStatus.slot) {
    const s = scheduleStatus.slot;
    return (
      <div className="mb-6 p-4 rounded-xl border border-sky-500/30 bg-sky-500/10 text-foreground shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-600 dark:text-sky-400 mt-0.5 sm:mt-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                <span>Next Up Today</span>
                <span className="text-muted-foreground">•</span>
                <span>Starts at {scheduleStatus.startTime}</span>
              </div>
              <h4 className="text-base font-bold text-foreground mt-0.5">
                {s.course_code}: {s.course_name}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s.faculty_name ? `Instructor: ${s.faculty_name}` : "Faculty scheduled"}
              </p>
            </div>
          </div>
          {s.room_number && (
            <div className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-background/80 border border-sky-500/30 flex items-center gap-1.5 text-sm font-mono font-semibold">
              <MapPin className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Room {s.room_number}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 py-2.5 px-4 rounded-xl border border-border/60 bg-muted/30 text-xs text-muted-foreground flex items-center gap-2">
      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
      <span>{scheduleStatus.message}</span>
    </div>
  );
}
