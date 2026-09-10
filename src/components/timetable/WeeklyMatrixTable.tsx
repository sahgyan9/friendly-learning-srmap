import { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, User, Calendar, CalendarDays, LayoutGrid } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface TimetableSlot {
  id: string;
  user_id: string;
  register_number: string;
  day_order: number | null;
  day_name: string;
  hour: number;
  start_time: string;
  end_time: string;
  slot: string | null;
  course_code: string;
  course_name: string;
  faculty_name: string | null;
  room_number: string | null;
  is_lab: boolean;
  ltpc?: string | null;
  last_synced_at: string;
}

export const PERIOD_HEADERS = [
  { hour: 1, label: "09:00 – 09:50" },
  { hour: 2, label: "10:00 – 10:50" },
  { hour: 3, label: "11:00 – 11:50" },
  { hour: 4, label: "12:00 – 12:50" },
  { hour: 5, label: "13:00 – 13:50" },
  { hour: 6, label: "14:00 – 14:50" },
  { hour: 7, label: "15:00 – 15:50" },
  { hour: 8, label: "16:00 – 17:30" },
];

const DAYS = [
  { key: "Monday", short: "Mon" },
  { key: "Tuesday", short: "Tue" },
  { key: "Wednesday", short: "Wed" },
  { key: "Thursday", short: "Thu" },
  { key: "Friday", short: "Fri" },
  { key: "Saturday", short: "Sat" },
];

// Consistent course styling palette matching the dark studio theme
const COURSE_COLORS: Record<string, { badge: string; text: string; border: string }> = {
  default: {
    badge: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
};

export const PALETTES = [
  {
    badge: "bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
  },
  {
    badge: "bg-sky-500/10 dark:bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
  },
  {
    badge: "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
  },
  {
    badge: "bg-purple-500/10 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
  },
  {
    badge: "bg-rose-500/10 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
  },
];

export function getCourseColorMap(slots: TimetableSlot[]) {
  const map: Record<string, { badge: string; text: string; border: string }> = {};
  const uniqueCourses = Array.from(new Set(slots.map((s) => s.course_code)));
  uniqueCourses.forEach((code, idx) => {
    map[code] = PALETTES[idx % PALETTES.length];
  });
  return map;
}

interface WeeklyMatrixTableProps {
  slots: TimetableSlot[];
  activeCourseCode?: string | null;
  onSelectCourse?: (courseCode: string) => void;
}

export default function WeeklyMatrixTable({
  slots,
  activeCourseCode,
  onSelectCourse,
}: WeeklyMatrixTableProps) {
  // Determine current day in IST
  const todayDayName = useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }).format(new Date());
    } catch {
      return "";
    }
  }, []);

  // Map courses to color tokens
  const courseColorMap = useMemo(() => {
    return getCourseColorMap(slots);
  }, [slots]);

  // Check if student has Saturday classes
  const showSaturday = useMemo(() => {
    return slots.some((s) => s.day_name.toLowerCase().includes("sat"));
  }, [slots]);

  const activeDays = useMemo(() => {
    return showSaturday ? DAYS : DAYS.slice(0, 5);
  }, [showSaturday]);

  // Default to Day view on mobile screens (< 768px), Week view on larger screens
  const [viewMode, setViewMode] = useState<"day" | "week">(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return "day";
    }
    return "week";
  });

  // Currently selected day in Day View
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    const match = DAYS.find((d) => d.key.toLowerCase() === todayDayName.toLowerCase());
    return match ? match.key : "Monday";
  });

  useEffect(() => {
    if (todayDayName) {
      const match = DAYS.find((d) => d.key.toLowerCase() === todayDayName.toLowerCase());
      if (match) setSelectedDayKey(match.key);
    }
  }, [todayDayName]);

  // Map slots by `day:hour`
  const slotGrid = useMemo(() => {
    const grid: Record<string, TimetableSlot> = {};
    for (const slot of slots) {
      const dayNorm = slot.day_name.toLowerCase();
      grid[`${dayNorm}:${slot.hour}`] = slot;
    }
    return grid;
  }, [slots]);

  // Slots for the selected day in Day View
  const selectedDaySlots = useMemo(() => {
    return slots
      .filter((s) => s.day_name.toLowerCase() === selectedDayKey.toLowerCase())
      .sort((a, b) => a.hour - b.hour);
  }, [slots, selectedDayKey]);

  return (
    <div className="w-full">
      {/* Header with View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            {viewMode === "day" ? "Daily Class Schedule" : "Weekly Matrix View"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {viewMode === "day"
              ? `Day-by-day class timeline for ${selectedDayKey}.`
              : "Weekly class schedule mapped across period hours 1 to 8."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {todayDayName && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Calendar className="w-3.5 h-3.5" />
              <span>Today: {todayDayName}</span>
            </div>
          )}

          {/* View Mode Toggle: Day vs Week */}
          <div className="flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                viewMode === "day"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Day Agenda View (Zero Horizontal Scroll)"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Day</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                viewMode === "week"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Weekly Matrix Grid"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Week</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODE 1: Day Agenda View (Zero Horizontal Scroll Guaranteed) */}
      {viewMode === "day" && (
        <div className="space-y-3">
          {/* Day Selector Pill Bar */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 bg-muted/40 border border-border/60 rounded-xl max-w-full">
            {activeDays.map((day) => {
              const isToday = todayDayName.toLowerCase() === day.key.toLowerCase();
              const isSelected = selectedDayKey.toLowerCase() === day.key.toLowerCase();
              const dayClassCount = slots.filter(
                (s) => s.day_name.toLowerCase() === day.key.toLowerCase()
              ).length;

              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDayKey(day.key)}
                  className={cn(
                    "flex-1 min-w-0 py-1.5 px-0.5 sm:px-1 rounded-lg text-center transition-all border flex flex-col items-center gap-0.5",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                      : isToday
                      ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15 font-semibold"
                      : "bg-card text-muted-foreground hover:text-foreground border-border/60 hover:bg-muted/60"
                  )}
                >
                  <span className="text-xs tracking-tight">{day.short}</span>
                  <span
                    className={cn(
                      "text-[10px]",
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {dayClassCount > 0 ? `${dayClassCount} cls` : "Free"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Classes Timeline for Selected Day */}
          {selectedDaySlots.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-xl border border-dashed border-border/70 bg-card/40 space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Calendar className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                No classes scheduled for {selectedDayKey}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Enjoy your free day or use this time for project work, study groups, and revision.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDaySlots.map((slot) => {
                const palette = courseColorMap[slot.course_code] || COURSE_COLORS.default;
                const isSelected = activeCourseCode === slot.course_code;

                return (
                  <div
                    key={slot.id || `${slot.day_name}-${slot.hour}`}
                    onClick={() => onSelectCourse?.(slot.course_code)}
                    className={cn(
                      "p-3.5 rounded-xl border bg-card transition-all cursor-pointer shadow-2xs hover:shadow-xs",
                      isSelected
                        ? "border-primary ring-1 ring-primary/40 bg-primary/5"
                        : "border-border/70 hover:border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono border",
                            palette.badge
                          )}
                        >
                          {slot.course_code}
                        </span>
                        {slot.is_lab && (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Lab
                          </span>
                        )}
                        {slot.slot && (
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                            {slot.slot}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-foreground font-mono">
                          {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Hour {slot.hour}
                        </span>
                      </div>
                    </div>

                    <h4 className="font-semibold text-sm text-foreground mt-1.5 line-clamp-1">
                      {slot.course_name}
                    </h4>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                        <span className="truncate" title={slot.faculty_name || ""}>
                          {slot.faculty_name || "Faculty not specified"}
                        </span>
                      </div>

                      {slot.room_number && (
                        <div className="inline-flex items-center gap-1 font-mono text-[11px] font-medium bg-muted/80 px-2 py-0.5 rounded border border-border/60 shrink-0">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span>{slot.room_number}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: Compact Weekly Matrix Grid (Zero Horizontal Scroll on Desktop) */}
      {viewMode === "week" && (
        <div className="relative rounded-xl border border-border/70 bg-card/60 shadow-xs overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse table-fixed min-w-[640px] sm:min-w-0">
            <thead>
              <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground">
                <th scope="col" className="py-2.5 px-2 w-[8%] text-center">
                  Day
                </th>
                {PERIOD_HEADERS.map((period) => (
                  <th
                    key={period.hour}
                    scope="col"
                    className="py-2 px-1 text-center border-l border-border/50 w-[11.5%]"
                  >
                    <div className="font-bold text-xs text-foreground/90">
                      H{period.hour}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-normal whitespace-nowrap">
                      {period.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {activeDays.map((day) => {
                const isToday = todayDayName.toLowerCase() === day.key.toLowerCase();
                return (
                  <tr
                    key={day.key}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      isToday && "bg-primary/[0.03] dark:bg-primary/[0.06]"
                    )}
                  >
                    {/* Day Column */}
                    <th
                      scope="row"
                      className={cn(
                        "py-2.5 px-1 font-semibold text-center align-middle border-r border-border/50",
                        isToday ? "text-primary bg-primary/5 font-bold" : "text-foreground"
                      )}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-xs">{day.short}</span>
                        {isToday && (
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>
                    </th>

                    {/* Period Columns */}
                    {PERIOD_HEADERS.map((period) => {
                      const slot = slotGrid[`${day.key.toLowerCase()}:${period.hour}`];
                      if (!slot) {
                        return (
                          <td
                            key={period.hour}
                            className="py-2 px-1 text-center text-muted-foreground/30 border-l border-border/40 font-mono text-xs select-none"
                          >
                            –
                          </td>
                        );
                      }

                      const palette = courseColorMap[slot.course_code] || COURSE_COLORS.default;
                      const isSelected = activeCourseCode === slot.course_code;

                      return (
                        <td
                          key={period.hour}
                          className={cn(
                            "py-1.5 px-1 text-center border-l border-border/40 align-middle",
                            isSelected && "bg-primary/10"
                          )}
                        >
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onSelectCourse?.(slot.course_code)}
                                  className={cn(
                                    "w-full text-center py-1.5 px-0.5 rounded-md transition-all border",
                                    palette.badge,
                                    "hover:brightness-110 active:scale-95 focus:outline-none focus:ring-1 focus:ring-primary/40"
                                  )}
                                >
                                  <div className="font-bold text-xs tracking-tight truncate">
                                    {slot.course_code}
                                  </div>
                                  {slot.room_number && (
                                    <div className="text-[10px] opacity-85 font-mono truncate">
                                      {slot.room_number}
                                    </div>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs p-3 text-left">
                                <p className="font-semibold text-xs text-foreground mb-1">
                                  {slot.course_code}: {slot.course_name}
                                </p>
                                <div className="space-y-1 text-[11px] text-muted-foreground">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 text-primary shrink-0" />
                                    <span>
                                      {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)} (Hour {slot.hour})
                                    </span>
                                  </div>
                                  {slot.room_number && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3 h-3 text-primary shrink-0" />
                                      <span>Room: {slot.room_number}</span>
                                    </div>
                                  )}
                                  {slot.faculty_name && (
                                    <div className="flex items-center gap-1.5">
                                      <User className="w-3 h-3 text-primary shrink-0" />
                                      <span>Faculty: {slot.faculty_name}</span>
                                    </div>
                                  )}
                                  {slot.is_lab && (
                                    <div className="mt-1 pt-1 border-t border-border/50 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                                      Practical / Laboratory Session
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
