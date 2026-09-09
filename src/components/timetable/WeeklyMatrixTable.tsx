import { useMemo } from "react";
import { Clock, MapPin, User, Calendar } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

const PALETTES = [
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
    const map: Record<string, { badge: string; text: string; border: string }> = {};
    const uniqueCourses = Array.from(new Set(slots.map((s) => s.course_code)));
    uniqueCourses.forEach((code, idx) => {
      map[code] = PALETTES[idx % PALETTES.length];
    });
    return map;
  }, [slots]);

  // Check if student has Saturday classes
  const showSaturday = useMemo(() => {
    return slots.some((s) => s.day_name.toLowerCase().includes("sat"));
  }, [slots]);

  const activeDays = useMemo(() => {
    return showSaturday ? DAYS : DAYS.slice(0, 5);
  }, [showSaturday]);

  // Map slots by `day:hour`
  const slotGrid = useMemo(() => {
    const grid: Record<string, TimetableSlot> = {};
    for (const slot of slots) {
      const dayNorm = slot.day_name.toLowerCase();
      grid[`${dayNorm}:${slot.hour}`] = slot;
    }
    return grid;
  }, [slots]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">Weekly Matrix View</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weekly class schedule mapped across period hours 1 to 8.
          </p>
        </div>
        {todayDayName && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            <Calendar className="w-3.5 h-3.5" />
            <span>Today is {todayDayName}</span>
          </div>
        )}
      </div>

      <div className="relative overflow-x-auto rounded-xl border border-border/70 bg-card/60 shadow-sm backdrop-blur-sm">
        <table className="w-full text-sm text-left border-collapse min-w-[780px]">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground">
              <th scope="col" className="py-3.5 px-4 w-[85px] sticky left-0 z-20 bg-muted/90 backdrop-blur-md">
                Day
              </th>
              {PERIOD_HEADERS.map((period) => (
                <th
                  key={period.hour}
                  scope="col"
                  className="py-3 px-3 text-center border-l border-border/50 min-w-[95px]"
                >
                  <div className="font-semibold text-foreground/80">
                    {period.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-normal">
                    Hour {period.hour}
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
                  className={`transition-colors hover:bg-muted/30 ${
                    isToday ? "bg-primary/[0.03] dark:bg-primary/[0.06]" : ""
                  }`}
                >
                  {/* Day Column (Sticky on Mobile) */}
                  <th
                    scope="row"
                    className={`py-4 px-4 font-semibold text-foreground sticky left-0 z-10 backdrop-blur-md ${
                      isToday
                        ? "bg-background/95 text-primary border-r-2 border-r-primary"
                        : "bg-background/95 border-r border-r-border/50"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm">{day.short}</span>
                      {isToday && (
                        <span className="text-[10px] font-medium text-primary uppercase tracking-wider">
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
                          className="py-3 px-2 text-center text-muted-foreground/40 border-l border-border/40 font-mono text-xs select-none"
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
                        className={`py-2 px-1.5 text-center border-l border-border/40 align-middle ${
                          isSelected ? "bg-primary/10" : ""
                        }`}
                      >
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => onSelectCourse?.(slot.course_code)}
                                className={`w-full text-center py-1.5 px-1 rounded-md transition-all ${palette.badge} hover:brightness-110 active:scale-95 focus:outline-none focus:ring-1 focus:ring-primary/40`}
                              >
                                <div className="font-semibold text-xs tracking-tight">
                                  {slot.course_code}
                                </div>
                                {slot.room_number && (
                                  <div className="text-[11px] opacity-85 font-mono mt-0.5 tracking-tight">
                                    ({slot.room_number})
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
    </div>
  );
}
