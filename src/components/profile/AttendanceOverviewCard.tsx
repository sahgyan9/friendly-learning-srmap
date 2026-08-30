import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatRelativeTime } from "@/utils/date-utils";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  register_number: string;
  course_code: string;
  course_name: string;
  slot: string | null;
  faculty_name: string | null;
  conducted_hours: number;
  attended_hours: number;
  absent_hours: number;
  attendance_percentage: number;
  classes_needed: number;
  safe_bunks: number;
  last_synced_at: string;
}

interface AttendanceOverviewCardProps {
  onOpenPortalImport?: () => void;
}

export const AttendanceOverviewCard = ({ onOpenPortalImport }: AttendanceOverviewCardProps) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchAttendance = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("student_attendance" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("attendance_percentage", { ascending: true });

      if (error) {
        console.error("Error fetching student attendance:", error);
      } else {
        setRecords((data as unknown as AttendanceRecord[]) || []);
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [user]);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to sync attendance.");
        return;
      }

      const res = await supabase.functions.invoke("sync-srm-portal", {
        body: { user_id: user.id, force: true },
      });

      if (res.error || res.data?.error) {
        const errMsg = res.data?.error || res.error?.message || "Attendance sync failed. Please verify your portal link.";
        toast.error(errMsg);
        if (res.data?.error?.includes("Re-link") || res.data?.error?.includes("No linked")) {
          onOpenPortalImport?.();
        }
      } else {
        toast.success("Attendance synced successfully from SRM Portal!");
        await fetchAttendance();
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Failed to sync attendance. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 p-6 flex items-center justify-center min-h-[120px]">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading attendance…
        </div>
      </div>
    );
  }

  // Empty / Not Linked State
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Attendance</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Link the SRM portal for weekday sync and 75% eligibility alerts.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onOpenPortalImport}
            className="gap-1.5 font-semibold text-xs h-8 self-start sm:self-auto shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Link portal
          </Button>
        </div>
      </div>
    );
  }

  const overallAttended = records.reduce((acc, r) => acc + r.attended_hours, 0);
  const overallConducted = records.reduce((acc, r) => acc + r.conducted_hours, 0);
  const overallPct = overallConducted > 0 ? Number(((overallAttended / overallConducted) * 100).toFixed(2)) : 100;
  const criticalCourses = records.filter((r) => r.attendance_percentage < 75.0);
  const lastSync = records[0]?.last_synced_at;
  const isDanger = overallPct < 75.0 || criticalCourses.length > 0;

  // Prioritize showing at-risk courses first in preview (up to 4 rows)
  const displayRecords = [...records].sort((a, b) => a.attendance_percentage - b.attendance_percentage).slice(0, 4);

  return (
    <div className="rounded-xl border border-border/60">
      {/* Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-foreground">Attendance</h3>
                <span className={`text-sm font-black tracking-tight ${overallPct < 75 ? "text-destructive" : overallPct < 80 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {overallPct}%
                </span>
              </div>
              <p className="text-2xs text-muted-foreground mt-0.5">
                {records.length} subjects{lastSync ? ` · updated ${formatRelativeTime(lastSync)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="gap-1.5 text-xs h-8"
              title="Sync latest attendance from portal"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing…" : "Sync"}
            </Button>
            <Link to="/attendance">
              <Button size="sm" variant="ghost" className="gap-1 text-xs h-8 font-semibold">
                Open
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* At-Risk Warning */}
      {criticalCourses.length > 0 && (
        <div className="mx-4 sm:mx-5 mb-3 pl-3 border-l-2 border-destructive flex items-center gap-2 text-xs">
          <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
          <span className="text-destructive font-medium truncate">
            {criticalCourses.map((c) => `${c.course_code} (${c.attendance_percentage}%)`).join(", ")} below 75%
          </span>
        </div>
      )}

      {/* Mini Table */}
      <div className="border-t border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent h-8">
              <TableHead className="text-2xs font-semibold py-1 pl-4 sm:pl-5">Subject</TableHead>
              <TableHead className="text-2xs font-semibold text-center py-1">Hours</TableHead>
              <TableHead className="text-2xs font-semibold text-center py-1">%</TableHead>
              <TableHead className="text-2xs font-semibold text-right pr-4 sm:pr-5 py-1">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRecords.map((rec) => {
              const isRecDanger = rec.attendance_percentage < 75.0;
              const isRecWarning = rec.attendance_percentage >= 75.0 && rec.attendance_percentage < 80.0;
              const statusColor = isRecDanger ? "border-l-destructive" : isRecWarning ? "border-l-amber-500" : "border-l-transparent";

              return (
                <TableRow key={rec.id || rec.course_code} className="border-border/40 text-xs h-auto">
                  <TableCell className={`py-2 pl-4 sm:pl-5 font-medium border-l-2 ${statusColor}`}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-foreground tracking-tight">{rec.course_code}</span>
                        {rec.slot && /^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/i.test(rec.slot.trim()) && (
                          <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1 py-0.2 rounded border border-primary/20">
                            {rec.slot}
                          </span>
                        )}
                        <span className="text-2xs text-muted-foreground truncate max-w-[130px] sm:max-w-[180px]" title={rec.course_name}>
                          {rec.course_name}
                        </span>
                      </div>
                      {rec.faculty_name && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[220px] mt-0.5" title={rec.faculty_name}>
                          {rec.faculty_name}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-center text-2xs text-muted-foreground">
                    {rec.attended_hours}/{rec.conducted_hours}
                  </TableCell>
                  <TableCell className="py-2 text-center font-bold">
                    <span className={isRecDanger ? "text-destructive" : isRecWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                      {rec.attendance_percentage}%
                    </span>
                  </TableCell>
                  <TableCell className="py-2 text-right pr-4 sm:pr-5">
                    {rec.classes_needed > 0 ? (
                      <span className="text-[11px] font-semibold text-destructive">
                        Need {rec.classes_needed}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {rec.safe_bunks} safe
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Footer Link */}
      {records.length > 4 && (
        <div className="px-4 sm:px-5 py-2.5 border-t border-border/60 flex items-center justify-between text-2xs text-muted-foreground">
          <span>Showing 4 of {records.length} subjects</span>
          <Link to="/attendance" className="font-semibold text-primary hover:underline">
            View all →
          </Link>
        </div>
      )}
    </div>
  );
};

export default AttendanceOverviewCard;
