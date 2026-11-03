import { useMemo } from "react";
import { MapPin, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

  if ((scheduleStatus.type === "ongoing" || scheduleStatus.type === "upcoming") && scheduleStatus.slot) {
    const s = scheduleStatus.slot;
    const ongoing = scheduleStatus.type === "ongoing";
    return (
      <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span
                className={cn("h-2 w-2 shrink-0 rounded-full", ongoing ? "bg-green-600" : "bg-primary")}
                aria-hidden
              />
              <span className="text-foreground">{ongoing ? "In session" : "Next today"}</span>
              <span aria-hidden>·</span>
              <span className="tabular">
                {ongoing ? `Ends ${scheduleStatus.endTime}` : `Starts ${scheduleStatus.startTime}`}
              </span>
            </p>
            <h4 className="mt-1 text-base font-semibold text-foreground">
              <span className="tabular">{s.course_code}</span>: {s.course_name}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {s.faculty_name ? `Instructor: ${s.faculty_name}` : "Faculty scheduled"}
            </p>
          </div>
          {s.room_number && (
            <div className="flex items-center gap-1.5 self-start rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground sm:self-center">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="tabular">Room {s.room_number}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 py-2.5 px-4 rounded-xl border border-border bg-card text-xs text-muted-foreground flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{scheduleStatus.message}</span>
    </div>
  );
}
