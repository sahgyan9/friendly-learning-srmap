import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
  const [simulations, setSimulations] = useState<Record<string, { deltaAttended: number; deltaConducted: number }>>({});

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
        // Fallback or ignore if table empty
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

  const handleManualSync = async () => {
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

  const getSimulatedMetrics = (rec: AttendanceRecord) => {
    const sim = simulations[rec.course_code] || { deltaAttended: 0, deltaConducted: 0 };
    const cond = Math.max(1, rec.conducted_hours + sim.deltaConducted);
    const att = Math.max(0, Math.min(cond, rec.attended_hours + sim.deltaAttended));
    const pct = Number(((att / cond) * 100).toFixed(2));
    const needed = pct < 75.0 ? Math.max(0, Math.ceil(3 * cond - 4 * att)) : 0;
    const safe = pct >= 75.0 ? Math.max(0, Math.floor((4 * att - 3 * cond) / 3)) : 0;
    return { pct, needed, safe, isSimulated: sim.deltaConducted !== 0 };
  };

  const adjustSim = (courseCode: string, attend: boolean, remove: boolean = false) => {
    setSimulations((prev) => {
      const curr = prev[courseCode] || { deltaAttended: 0, deltaConducted: 0 };
      if (remove) {
        return {
          ...prev,
          [courseCode]: { deltaAttended: 0, deltaConducted: 0 },
        };
      }
      return {
        ...prev,
        [courseCode]: {
          deltaConducted: curr.deltaConducted + 1,
          deltaAttended: curr.deltaAttended + (attend ? 1 : 0),
        },
      };
    });
  };

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardContent className="p-8 flex items-center justify-center min-h-[200px]">
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Loading attendance records...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="border-dashed border-border/70 bg-muted/20">
        <CardHeader className="text-center pb-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
            <GraduationCap className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">SRM Portal Attendance & Bunk Predictor</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Connect your SRM student portal to track live course attendance, get <strong className="text-foreground">&lt; 75%</strong> danger alerts on your bell icon, and calculate safe bunks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 pb-6">
          <Button
            type="button"
            onClick={onOpenPortalImport}
            className="gap-2 shadow-sm font-medium"
          >
            <Sparkles className="h-4 w-4" />
            Link SRM Portal & Import Attendance
          </Button>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Auto-syncs Mon–Fri at 5:00 PM (Skips holidays & weekends)
          </p>
        </CardContent>
      </Card>
    );
  }

  const overallAttended = records.reduce((acc, r) => acc + r.attended_hours, 0);
  const overallConducted = records.reduce((acc, r) => acc + r.conducted_hours, 0);
  const overallPct = overallConducted > 0 ? Number(((overallAttended / overallConducted) * 100).toFixed(2)) : 100;
  const criticalCourses = records.filter((r) => r.attendance_percentage < 75.0);
  const safeCourses = records.filter((r) => r.attendance_percentage >= 75.0);
  const lastSync = records[0]?.last_synced_at;

  return (
    <Card className="border-border/70 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Course Attendance & Bunk Calculator
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Mon–Fri 5:00 PM automatic sync • Real-time bell & push alerts when &lt; 75%
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="gap-1.5 text-xs h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </div>
        </div>

        {/* Global KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-border/40">
          <div className="p-2.5 rounded-lg bg-background border border-border/50">
            <div className="text-2xs text-muted-foreground uppercase font-semibold">Overall Attendance</div>
            <div className={`text-xl font-bold mt-0.5 ${overallPct < 75 ? "text-destructive" : overallPct < 80 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {overallPct}%
            </div>
            <div className="text-2xs text-muted-foreground mt-0.5">
              {overallAttended} / {overallConducted} hrs
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background border border-border/50">
            <div className="text-2xs text-muted-foreground uppercase font-semibold">At Risk (&lt; 75%)</div>
            <div className={`text-xl font-bold mt-0.5 ${criticalCourses.length > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
              {criticalCourses.length} {criticalCourses.length === 1 ? "course" : "courses"}
            </div>
            <div className="text-2xs text-muted-foreground mt-0.5">
              {criticalCourses.length > 0 ? "Recovery alert active" : "All courses safe"}
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background border border-border/50">
            <div className="text-2xs text-muted-foreground uppercase font-semibold">Safe Courses</div>
            <div className="text-xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
              {safeCourses.length}
            </div>
            <div className="text-2xs text-muted-foreground mt-0.5">
              Above 75% cutoff
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-background border border-border/50">
            <div className="text-2xs text-muted-foreground uppercase font-semibold">Last Auto-Sync</div>
            <div className="text-xs font-medium text-foreground mt-1 truncate">
              {lastSync ? formatRelativeTime(lastSync) : "Recently"}
            </div>
            <div className="text-2xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Live & Connected
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4">
        {criticalCourses.length > 0 && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-semibold text-destructive">Attendance Warning:</span> You have{" "}
              <strong>{criticalCourses.length} course(s)</strong> below the mandatory 75% SRM threshold. Check the recovery actions below to get back on track.
            </div>
          </div>
        )}

        {/* Course Cards Grid */}
        <div className="space-y-3">
          {records.map((rec) => {
            const { pct, needed, safe, isSimulated } = getSimulatedMetrics(rec);
            const isDanger = pct < 75.0;
            const isWarning = pct >= 75.0 && pct < 80.0;

            const progressColor = isDanger
              ? "bg-destructive"
              : isWarning
              ? "bg-amber-500"
              : "bg-emerald-500";

            return (
              <div
                key={rec.id || rec.course_code}
                className={`p-4 rounded-xl border transition-all ${
                  isDanger
                    ? "bg-destructive/5 border-destructive/30 hover:border-destructive/50"
                    : isWarning
                    ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                    : "bg-card border-border/60 hover:border-border"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{rec.course_code}</span>
                      {rec.slot && (
                        <Badge variant="outline" className="text-2xs py-0 h-4 bg-muted/60">
                          {rec.slot}
                        </Badge>
                      )}
                      {isDanger && (
                        <Badge variant="destructive" className="text-2xs py-0 h-4 gap-1">
                          <AlertTriangle className="h-3 w-3" /> Below 75%
                        </Badge>
                      )}
                      {isSimulated && (
                        <Badge variant="secondary" className="text-2xs py-0 h-4 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          Simulated
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{rec.course_name}</p>
                  </div>

                  {/* Percentage & Bunk Margin Pill */}
                  <div className="flex items-center gap-3 self-start sm:self-auto">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isDanger ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {pct}%
                      </div>
                      <div className="text-2xs text-muted-foreground">
                        {rec.attended_hours}/{rec.conducted_hours} hrs
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="space-y-1 mb-3">
                  <div className="relative h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                    />
                    {/* 75% marker line */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-foreground/40 z-10"
                      style={{ left: "75%" }}
                      title="75% SRM Cutoff"
                    />
                  </div>
                  <div className="flex justify-between text-2xs text-muted-foreground">
                    <span>0%</span>
                    <span className="font-semibold text-foreground/70">75% Cutoff</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Recovery / Bunk Advice Pill + Simulator Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isDanger ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/15 text-destructive font-medium text-xs">
                        <TrendingUp className="h-3.5 w-3.5" />
                        Attend next <strong>{needed}</strong> class{needed === 1 ? "" : "es"} consecutively to reach 75%
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-medium text-xs">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        You can bunk <strong>{safe}</strong> class{safe === 1 ? "" : "es"} safely
                      </span>
                    )}
                  </div>

                  {/* Quick Simulation Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <span className="text-2xs text-muted-foreground mr-1">Predict:</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-2xs gap-1 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      onClick={() => adjustSim(rec.course_code, true)}
                      title="Simulate attending next class (+1)"
                    >
                      +1 Attend
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-2xs gap-1 border-destructive/30 hover:bg-destructive/10 text-destructive"
                      onClick={() => adjustSim(rec.course_code, false)}
                      title="Simulate missing next class (+1 Miss)"
                    >
                      +1 Miss
                    </Button>
                    {isSimulated && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-2xs text-muted-foreground hover:text-foreground"
                        onClick={() => adjustSim(rec.course_code, false, true)}
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceOverviewCard;
