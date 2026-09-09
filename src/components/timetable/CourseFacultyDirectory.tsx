import { useMemo } from "react";
import { Link } from "react-router-dom";
import { User, MapPin, ExternalLink } from "lucide-react";
import { TimetableSlot, PALETTES, getCourseColorMap } from "./WeeklyMatrixTable";
import { getFacultyDirectoryUrl } from "@/integrations/supabase/services/faculty";
import { cn } from "@/lib/utils";

interface CourseFacultyDirectoryProps {
  slots: TimetableSlot[];
  activeCourseCode?: string | null;
  onSelectCourse?: (courseCode: string) => void;
}

export interface CourseDirectoryItem {
  code: string;
  name: string;
  ltpc?: string;
  facultyName: string;
  facultyUrl?: string;
  rooms: string[];
  totalWeeklyHours: number;
  isLab: boolean;
}

export default function CourseFacultyDirectory({
  slots,
  activeCourseCode,
  onSelectCourse,
}: CourseFacultyDirectoryProps) {
  const courseColorMap = useMemo(() => {
    return getCourseColorMap(slots);
  }, [slots]);

  const directory = useMemo(() => {
    const map: Record<string, CourseDirectoryItem> = {};

    for (const slot of slots) {
      if (!map[slot.course_code]) {
        // Fallback for current SRM AP courses if older cache lacks slot.ltpc
        let fallbackLtpc: string | undefined = undefined;
        if (slot.course_code === "PHY 424" || slot.course_code === "PHY 425") fallbackLtpc = "2-0-2-4";
        if (slot.course_code === "PHY 426") fallbackLtpc = "3-1-0-4";

        map[slot.course_code] = {
          code: slot.course_code,
          name: slot.course_name,
          ltpc: slot.ltpc || fallbackLtpc,
          facultyName: slot.faculty_name || "Faculty not specified",
          facultyUrl: slot.faculty_name ? getFacultyDirectoryUrl(slot.faculty_name) : undefined,
          rooms: [],
          totalWeeklyHours: 0,
          isLab: slot.is_lab,
        };
      } else if (slot.ltpc && !map[slot.course_code].ltpc) {
        map[slot.course_code].ltpc = slot.ltpc;
      }

      map[slot.course_code].totalWeeklyHours += 1;

      if (slot.room_number && !map[slot.course_code].rooms.includes(slot.room_number)) {
        map[slot.course_code].rooms.push(slot.room_number);
      }
      if (slot.is_lab) {
        map[slot.course_code].isLab = true;
      }
    }

    return Object.values(map).sort((a, b) => a.code.localeCompare(b.code));
  }, [slots]);

  if (directory.length === 0) return null;

  return (
    <div className="w-full mt-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            Course &amp; Faculty Directory
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registered courses, faculty instructors, and assigned venues.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card/60 shadow-sm backdrop-blur-sm">
        <table className="w-full text-sm text-left border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-border/80 bg-muted/40 text-xs font-semibold text-muted-foreground">
              <th scope="col" className="py-3 px-4 w-[110px]">
                Code
              </th>
              <th scope="col" className="py-3 px-4">
                Course Name
              </th>
              <th scope="col" className="py-3 px-3 text-center w-[120px]">
                L-T-P-C
              </th>
              <th scope="col" className="py-3 px-4">
                Faculty
              </th>
              <th scope="col" className="py-3 px-4">
                Assigned Rooms
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {directory.map((item) => {
              const isSelected = activeCourseCode === item.code;
              const palette = courseColorMap[item.code] || PALETTES[0];

              return (
                <tr
                  key={item.code}
                  onClick={() => onSelectCourse?.(item.code)}
                  className={`cursor-pointer transition-colors hover:bg-muted/40 ${
                    isSelected ? "bg-primary/5 dark:bg-primary/10" : ""
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-semibold">
                    <span
                      className={cn(
                        "inline-block px-2.5 py-1 rounded text-xs tracking-tight font-semibold border",
                        palette.badge
                      )}
                    >
                      {item.code}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center text-xs font-mono">
                    <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-xs font-medium bg-muted/70 text-foreground/90 border border-border/60">
                      {item.ltpc || "—"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {item.facultyUrl ? (
                      <Link
                        to={item.facultyUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-primary hover:underline font-medium text-xs group"
                      >
                        <User className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span>{item.facultyName}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </Link>
                    ) : (
                      <span className="text-foreground text-xs flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        {item.facultyName}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.rooms.length > 0 ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.rooms.map((room) => (
                          <span
                            key={room}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono bg-muted text-foreground/90 border border-border"
                          >
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            {room}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
