import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
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
      <Card className="border-border/60">
        <CardContent className="p-6 flex items-center justify-center min-h-[140px]">
          <div className="flex items-center gap-2.5 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading attendance records...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-muted/20 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">SRM Portal Attendance & Bunk Predictor</CardTitle>
                <CardDescription className="text-xs">
                  Connect portal for live tracking, safe bunk calculator & 75% shortage alerts
                </CardDescription>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={onOpenPortalImport}
              className="gap-1.5 font-semibold text-xs shadow-sm shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Link SRM Portal
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-4">
          <p className="text-xs text-muted-foreground">
            Auto-syncs Monday–Friday at 5:00 PM IST (skipping weekends & holidays). Get instant alerts when attendance falls below 75%.
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

  return (
    <Card className={`overflow-hidden border shadow-sm transition-all ${
      isDanger
        ? "border-destructive/30 bg-gradient-to-r from-destructive/[0.04] via-card to-card"
        : "border-border/70 bg-card hover:border-primary/40"
    }`}>
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isDanger ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
            }`}>
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-bold text-foreground">
                  SRM Portal Attendance & Bunk Predictor
                </CardTitle>
                <Badge
                  variant={isDanger ? "destructive" : "outline"}
                  className={`text-2xs font-semibold ${
                    !isDanger ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10" : ""
                  }`}
                >
                  {isDanger ? `${criticalCourses.length} at Risk (< 75%)` : "All Courses Safe"}
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5 flex items-center gap-2 text-muted-foreground flex-wrap">
                <span>{records.length} enrolled subjects</span>
                <span>•</span>
                <span>Auto-syncs weekdays at 5:00 PM</span>
                {lastSync && (
                  <>
                    <span>•</span>
                    <span className="text-foreground/80">Updated {formatRelativeTime(lastSync)}</span>
                  </>
                )}
              </CardDescription>
            </div>
          </div>

          {/* Actions */}
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
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
            <Link to="/attendance">
              <Button size="sm" className="gap-1.5 text-xs h-8 font-semibold shadow-sm">
                Open Full Calculator
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
        {/* KPI Mini-Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <div className="text-2xs font-semibold text-muted-foreground uppercase">Overall Attendance</div>
            <div className={`text-xl font-black mt-0.5 ${
              overallPct < 75 ? "text-destructive" : overallPct < 80 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
            }`}>
              {overallPct}%
            </div>
            <div className="text-2xs text-muted-foreground">{overallAttended} / {overallConducted} hrs</div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <div className="text-2xs font-semibold text-muted-foreground uppercase">Shortage Courses</div>
            <div className={`text-xl font-black mt-0.5 ${criticalCourses.length > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {criticalCourses.length}
            </div>
            <div className="text-2xs text-muted-foreground">{criticalCourses.length > 0 ? "Requires recovery" : "None"}</div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50">
            <div className="text-2xs font-semibold text-muted-foreground uppercase">Safe Bunk Margin</div>
            <div className="text-xl font-black mt-0.5 text-emerald-600 dark:text-emerald-400">
              {totalSafeBunks}
            </div>
            <div className="text-2xs text-muted-foreground">Lectures available</div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex flex-col justify-between">
            <div className="text-2xs font-semibold text-muted-foreground uppercase">What-If Predictor</div>
            <Link to="/attendance" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 mt-1">
              Test Bunks & Targets <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <div className="text-2xs text-muted-foreground">Interactive Simulator</div>
          </div>
        </div>

        {/* Shortage Mini-List or Safe Pill */}
        {criticalCourses.length > 0 ? (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-destructive font-medium min-w-0">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="truncate">
                {criticalCourses.map((c) => `${c.course_code} (${c.attendance_percentage}%)`).join(", ")} below 75%
              </span>
            </div>
            <Link to="/attendance" className="text-2xs font-bold text-destructive hover:underline shrink-0 flex items-center gap-1">
              View Recovery Action Plan <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
            <span className="text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              All subjects above 75% cutoff threshold.
            </span>
            <Link to="/attendance" className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1">
              Open Dashboard <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceOverviewCard;
