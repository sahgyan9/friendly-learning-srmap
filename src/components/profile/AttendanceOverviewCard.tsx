import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

      if (res.error) {
        toast.error("Attendance sync failed. Please verify your portal link.");
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
      <Card className="border-border/60 shadow-xs">
        <CardContent className="p-6 flex items-center justify-center min-h-[120px]">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading attendance records...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty / Not Linked State
  if (records.length === 0) {
    return (
      <Card className="border-dashed border-border/80 bg-muted/20 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  SRM Portal Attendance
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Link portal for automatic weekday attendance tracking & 75% examination alerts
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onOpenPortalImport}
              className="gap-1.5 font-semibold text-xs h-8 shadow-xs self-start sm:self-auto shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Link Portal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 pb-4 pt-0">
          <p className="text-2xs text-muted-foreground">
            Auto-syncs Monday–Friday at 5:00 PM IST (skips weekends & university holidays).
          </p>
        </CardContent>
      </Card>
    );
  }

  const overallAttended = records.reduce((acc, r) => acc + r.attended_hours, 0);
  const overallConducted = records.reduce((acc, r) => acc + r.conducted_hours, 0);
  const overallPct = overallConducted > 0 ? Number(((overallAttended / overallConducted) * 100).toFixed(2)) : 100;
  const criticalCourses = records.filter((r) => r.attendance_percentage < 75.0);
  const totalSafeBunks = records.reduce((acc, r) => acc + (r.safe_bunks || 0), 0);
  const lastSync = records[0]?.last_synced_at;
  const isDanger = overallPct < 75.0 || criticalCourses.length > 0;

  // Prioritize showing at-risk courses first in preview (up to 4 rows)
  const displayRecords = [...records].sort((a, b) => a.attendance_percentage - b.attendance_percentage).slice(0, 4);

  return (
    <Card className={`overflow-hidden border shadow-xs transition-all ${
      isDanger
        ? "border-destructive/30 bg-card"
        : "border-border/70 bg-card"
    }`}>
      {/* Header */}
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isDanger ? "bg-destructive/15 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            }`}>
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                  Course Attendance
                </CardTitle>
                <Badge
                  variant={isDanger ? "destructive" : "outline"}
                  className={`text-2xs font-semibold h-5 px-1.5 ${
                    !isDanger ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : ""
                  }`}
                >
                  {isDanger ? `${criticalCourses.length} at Risk (<75%)` : "All Courses Safe"}
                </Badge>
              </div>
              <CardDescription className="text-2xs sm:text-xs mt-0.5 flex items-center gap-1.5 text-muted-foreground flex-wrap">
                <span>{records.length} subjects</span>
                <span>•</span>
                <span>Overall: <strong className={overallPct < 75 ? "text-destructive" : "text-foreground"}>{overallPct}%</strong></span>
                {lastSync && (
                  <>
                    <span>•</span>
                    <span>Updated {formatRelativeTime(lastSync)}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="gap-1.5 text-xs h-8 border-border/80"
              title="Sync latest attendance from portal"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-emerald-600" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
            <Link to="/attendance">
              <Button size="sm" className="gap-1.5 text-xs h-8 font-semibold shadow-xs">
                Open Table
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
        
        {/* At-Risk Warning Pill if any */}
        {criticalCourses.length > 0 && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-destructive font-medium min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {criticalCourses.map((c) => `${c.course_code} (${c.attendance_percentage}%)`).join(", ")} below 75%
              </span>
            </div>
            <Link to="/attendance" className="text-2xs font-bold text-destructive hover:underline shrink-0">
              View Plan →
            </Link>
          </div>
        )}

        {/* Mini Attendance Table */}
        <div className="rounded-lg border border-border/60 overflow-hidden bg-background">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/50 hover:bg-transparent h-8">
                <TableHead className="text-2xs font-semibold py-1">Subject</TableHead>
                <TableHead className="text-2xs font-semibold text-center py-1">Hours</TableHead>
                <TableHead className="text-2xs font-semibold text-center py-1">Percentage</TableHead>
                <TableHead className="text-2xs font-semibold text-right pr-3 py-1">75% Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayRecords.map((rec) => {
                const isRecDanger = rec.attendance_percentage < 75.0;
                const isRecWarning = rec.attendance_percentage >= 75.0 && rec.attendance_percentage < 80.0;

                return (
                  <TableRow
                    key={rec.id || rec.course_code}
                    className={`border-border/40 text-xs h-9 ${
                      isRecDanger ? "bg-destructive/[0.03]" : isRecWarning ? "bg-amber-500/[0.02]" : ""
                    }`}
                  >
                    <TableCell className="py-2 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-foreground tracking-tight">{rec.course_code}</span>
                        <span className="text-2xs text-muted-foreground truncate max-w-[130px] sm:max-w-[200px]" title={rec.course_name}>
                          {rec.course_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-center text-2xs text-muted-foreground">
                      {rec.attended_hours} / {rec.conducted_hours}
                    </TableCell>
                    <TableCell className="py-2 text-center font-bold">
                      <span className={isRecDanger ? "text-destructive" : isRecWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>
                        {rec.attendance_percentage}%
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right pr-3">
                      {rec.classes_needed > 0 ? (
                        <span className="text-[11px] font-semibold text-destructive inline-flex items-center gap-0.5">
                          Need {rec.classes_needed} cls
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-0.5">
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
        <div className="flex items-center justify-between text-2xs text-muted-foreground pt-1">
          <span>
            {records.length > 4 ? `Showing 4 of ${records.length} subjects` : `${records.length} registered subjects`}
          </span>
          <Link to="/attendance" className="font-semibold text-primary hover:underline flex items-center gap-1">
            Simulate & View Full Table <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

      </CardContent>
    </Card>
  );
};

export default AttendanceOverviewCard;
