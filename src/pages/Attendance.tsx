import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpDown,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  Info,
  LayoutGrid,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Table as TableIcon,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import SEOHead from "@/components/SEOHead";
import { ImportSrmPortalDialog } from "@/components/profile/ImportSrmPortal";

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

const TARGET_PRESETS = [75, 80, 85, 90];

type SortField = "course_code" | "attendance_percentage" | "conducted_hours" | "margin";
type SortDirection = "asc" | "desc";

export default function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "danger" | "warning" | "safe">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalTarget, setGlobalTarget] = useState<number>(75);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [sortField, setSortField] = useState<SortField>("attendance_percentage");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
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

  // Revalidate attendance on pull-to-refresh gesture
  useEffect(() => {
    const handlePullRefresh = () => {
      fetchAttendance();
    };
    window.addEventListener("fl:refresh", handlePullRefresh);
    return () => window.removeEventListener("fl:refresh", handlePullRefresh);
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

      if (res.error || res.data?.error) {
        const errMsg = res.data?.error || res.error?.message || "Attendance sync failed. Please verify your portal link.";
        toast.error(errMsg);
        if (res.data?.error?.includes("Re-link") || res.data?.error?.includes("No linked")) {
          setPortalDialogOpen(true);
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

  const getSimulatedMetrics = (rec: AttendanceRecord, targetPercentage: number = 75) => {
    const sim = simulations[rec.course_code] || { deltaAttended: 0, deltaConducted: 0 };
    const cond = Math.max(1, rec.conducted_hours + sim.deltaConducted);
    const att = Math.max(0, Math.min(cond, rec.attended_hours + sim.deltaAttended));
    const pct = Number(((att / cond) * 100).toFixed(2));
    
    let neededForTarget = 0;
    if (pct < targetPercentage && targetPercentage < 100) {
      neededForTarget = Math.max(0, Math.ceil((targetPercentage * cond - 100 * att) / (100 - targetPercentage)));
    }

    let safeAllowanceForTarget = 0;
    if (pct >= targetPercentage && targetPercentage > 0) {
      safeAllowanceForTarget = Math.max(0, Math.floor((100 * att - targetPercentage * cond) / targetPercentage));
    }

    return {
      pct,
      cond,
      att,
      neededForTarget,
      safeAllowanceForTarget,
      isSimulated: sim.deltaConducted !== 0,
      deltaAttended: sim.deltaAttended,
      deltaConducted: sim.deltaConducted,
    };
  };

  const adjustSim = (courseCode: string, attend: boolean, reset: boolean = false) => {
    setSimulations((prev) => {
      if (reset) {
        const next = { ...prev };
        delete next[courseCode];
        return next;
      }
      const curr = prev[courseCode] || { deltaAttended: 0, deltaConducted: 0 };
      return {
        ...prev,
        [courseCode]: {
          deltaConducted: curr.deltaConducted + 1,
          deltaAttended: curr.deltaAttended + (attend ? 1 : 0),
        },
      };
    });
  };

  const simulateFullDayPresent = () => {
    setSimulations((prev) => {
      const next = { ...prev };
      for (const rec of records) {
        const curr = next[rec.course_code] || { deltaAttended: 0, deltaConducted: 0 };
        next[rec.course_code] = {
          deltaConducted: curr.deltaConducted + 1,
          deltaAttended: curr.deltaAttended + 1,
        };
      }
      return next;
    });
    toast.success("Simulated +1 attended class for all enrolled subjects");
  };

  const resetAllSimulations = () => {
    setSimulations({});
    toast.info("Reset all attendance simulations");
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(field === "attendance_percentage" ? "asc" : "desc");
    }
  };

  // Aggregates
  const totalAttended = records.reduce((acc, r) => acc + r.attended_hours, 0);
  const totalConducted = records.reduce((acc, r) => acc + r.conducted_hours, 0);
  const overallPct = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) : 100;
  const criticalCourses = records.filter((r) => r.attendance_percentage < 75.0);
  const warningCourses = records.filter((r) => r.attendance_percentage >= 75.0 && r.attendance_percentage < 80.0);
  const safeCourses = records.filter((r) => r.attendance_percentage >= 80.0);
  const lastSync = records[0]?.last_synced_at;
  const totalSafeAllowance = records.reduce((acc, r) => acc + (r.safe_bunks || 0), 0);

  const filteredAndSortedRecords = useMemo(() => {
    const list = records.filter((r) => {
      if (filterTab === "danger" && r.attendance_percentage >= 75.0) return false;
      if (filterTab === "warning" && (r.attendance_percentage < 75.0 || r.attendance_percentage >= 80.0)) return false;
      if (filterTab === "safe" && r.attendance_percentage < 80.0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = r.course_code.toLowerCase().includes(q);
        const nameMatch = r.course_name.toLowerCase().includes(q);
        const slotMatch = r.slot?.toLowerCase().includes(q) ?? false;
        const facultyMatch = r.faculty_name?.toLowerCase().includes(q) ?? false;
        return codeMatch || nameMatch || slotMatch || facultyMatch;
      }
      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === "attendance_percentage") {
        // Stable sort based on base recorded percentage (prevents rows from jumping under the cursor during simulation)
        comparison = a.attendance_percentage - b.attendance_percentage;
      } else if (sortField === "course_code") {
        comparison = a.course_code.localeCompare(b.course_code);
      } else if (sortField === "conducted_hours") {
        comparison = a.conducted_hours - b.conducted_hours;
      } else if (sortField === "margin") {
        const marginA = (a.safe_bunks || 0) - (a.classes_needed || 0);
        const marginB = (b.safe_bunks || 0) - (b.classes_needed || 0);
        comparison = marginA - marginB;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return list;
  }, [records, filterTab, searchQuery, sortField, sortDirection]);

  const hasAnySimulation = Object.keys(simulations).length > 0;

  return (
    <>
      <SEOHead
        title="Attendance | Friendly Learning SRMAP"
        description="Track live course attendance from the SRM AP student portal, monitor 75% examination eligibility thresholds, and plan upcoming classes."
      />

      <div className="min-h-screen bg-background pb-16">
        
        {/* Standard Brand Hero Header */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-emerald-500/5 via-background to-background">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-emerald-500/5 blur-2xl" />

          <div className="container max-w-6xl mx-auto px-4 sm:px-6 pb-6 pt-20 sm:pt-22">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Breadcrumb row */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2.5">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                <Link to="/profile" className="hover:text-foreground transition-colors">Profile</Link>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-foreground font-medium">Attendance</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  {/* Standard Pill Label */}
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                    <GraduationCap className="h-3.5 w-3.5" />
                    09 — Attendance
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Course Attendance
                  </h1>
                  <p className="mt-1 max-w-2xl text-xs sm:text-sm text-muted-foreground">
                    Live SRM University-AP attendance records, examination eligibility calculations, and class projection planner.
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {records.length > 0 && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleManualSync}
                        disabled={isSyncing}
                        className="gap-2 h-8 text-xs font-medium border-border/80 hover:bg-muted/60"
                      >
                        <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-emerald-600 dark:text-emerald-400" : ""}`} />
                        {isSyncing ? "Syncing..." : "Sync Portal"}
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPortalDialogOpen(true)}
                        className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        Re-link Portal
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container max-w-6xl mx-auto px-4 sm:px-6 pt-6">

          {/* Loading State */}
          {isLoading && (
            <Card className="border-border/60 shadow-sm bg-card">
              <CardContent className="p-12 flex items-center justify-center min-h-[260px]">
                <div className="flex flex-col items-center gap-2.5 text-muted-foreground text-sm">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  <p className="font-medium text-foreground">Loading attendance records...</p>
                  <p className="text-xs text-muted-foreground">Fetching live data from your student profile</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty / Not Linked State */}
          {!isLoading && records.length === 0 && (
            <Card className="border-dashed border-border/80 bg-muted/20 shadow-sm">
              <CardContent className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-foreground">No Attendance Data Linked Yet</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Connect your SRM AP Student Portal to track subject attendance, calculate your safe leave buffer above 75%, and get instant eligibility alerts.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    size="default"
                    onClick={() => setPortalDialogOpen(true)}
                    className="gap-2 font-semibold shadow-sm px-5 h-10"
                  >
                    <Sparkles className="h-4 w-4" />
                    Link SRM Portal & Import Attendance
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div className="p-3 rounded-lg bg-card border border-border/60">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Weekday Sync
                    </div>
                    <p className="text-2xs text-muted-foreground">Auto-refreshes Mon–Fri at 5:30 PM IST.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/60">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> 75% Cutoff Alerts
                    </div>
                    <p className="text-2xs text-muted-foreground">Notifications before you drop below eligibility.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/60">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <Calculator className="h-3.5 w-3.5 text-primary" /> Class Planner
                    </div>
                    <p className="text-2xs text-muted-foreground">Simulate attending or missing future lectures.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Attendance Dashboard */}
          {!isLoading && records.length > 0 && (
            <div className="space-y-5">
              
              {/* Shortage Alert Banner (Minimalist) */}
              {criticalCourses.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/25 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/15 text-destructive shrink-0">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-destructive flex items-center gap-2">
                        Attendance Shortage: {criticalCourses.length} Subject{criticalCourses.length === 1 ? "" : "s"} Below 75% Cutoff
                      </div>
                      <p className="text-2xs sm:text-xs text-muted-foreground mt-0.5">
                        {criticalCourses.map((c) => `${c.course_code} (${c.attendance_percentage}%)`).join(", ")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setFilterTab("danger")}
                    className="shrink-0 text-xs h-8 gap-1.5 self-end sm:self-auto font-medium"
                  >
                    Filter At-Risk ({criticalCourses.length})
                  </Button>
                </div>
              )}

              {/* Minimalist Top Summary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* 1. Overall Attendance */}
                <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Overall Attendance</span>
                    <GraduationCap className="h-4 w-4 text-primary shrink-0" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      overallPct < 75 ? "text-destructive" : overallPct < 80 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {overallPct}%
                    </span>
                    <Badge variant={overallPct < 75 ? "destructive" : "outline"} className="text-2xs font-semibold h-5 px-1.5">
                      {overallPct >= 75 ? "Eligible" : "Shortage"}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1">
                    <Progress
                      value={Math.min(100, overallPct)}
                      className={`h-1.5 bg-muted ${
                        overallPct < 75 ? "[&>div]:bg-destructive" : overallPct < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                      }`}
                    />
                    <div className="flex justify-between text-2xs text-muted-foreground">
                      <span>{totalAttended} attended</span>
                      <span>{totalConducted} total hrs</span>
                    </div>
                  </div>
                </div>

                {/* 2. Shortage Status */}
                <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">75% Cutoff Status</span>
                    <AlertTriangle className={`h-4 w-4 shrink-0 ${criticalCourses.length > 0 ? "text-destructive" : "text-emerald-500"}`} />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className={`text-2xl sm:text-3xl font-black tracking-tight ${criticalCourses.length > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {criticalCourses.length}
                    </span>
                    <Badge variant="outline" className="text-2xs font-semibold text-muted-foreground h-5 px-1.5">
                      &lt; 75% Cutoff
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-2 line-clamp-1">
                    {criticalCourses.length === 0 ? "All courses meet minimum 75%." : `${criticalCourses.length} course(s) require recovery.`}
                  </p>
                </div>

                {/* 3. Safe Leave Buffer */}
                <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Safe Leave Buffer</span>
                    <Zap className="h-4 w-4 text-emerald-500 shrink-0" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                      {totalSafeAllowance}
                    </span>
                    <Badge variant="outline" className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 h-5 px-1.5">
                      Classes Buffer
                    </Badge>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-2 line-clamp-1">
                    Combined class margin above 75% threshold.
                  </p>
                </div>

                {/* 4. Enrolled & Sync Info */}
                <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">Enrolled Subjects</span>
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                      {records.length}
                    </span>
                    <Badge variant="outline" className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1 h-5 px-1.5">
                      <CheckCircle2 className="h-3 w-3" /> Live
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-0.5 text-2xs text-muted-foreground">
                    <div className="flex items-center justify-between gap-1">
                      <span>Last sync:</span>
                      <strong className="text-foreground font-medium truncate">{lastSync ? formatRelativeTime(lastSync) : "Never"}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>Auto-sync:</span>
                      <span>Mon–Fri 5:30 PM IST</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Minimalist Controls Toolbar */}
              <div className="p-3.5 rounded-xl bg-card border border-border/70 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  
                  {/* Left: Target Goal Selector & Quick Simulations */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-xs font-semibold text-foreground shrink-0">
                      <Calculator className="h-3.5 w-3.5 text-primary" />
                      <span>Target:</span>
                    </div>
                    <div className="inline-flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/60">
                      {TARGET_PRESETS.map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setGlobalTarget(target)}
                          className={`text-xs px-2.5 py-1 font-semibold rounded-md transition-all ${
                            globalTarget === target
                              ? "bg-background text-foreground shadow-xs border border-border/60"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {target}% {target === 75 ? "Cutoff" : ""}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 ml-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={simulateFullDayPresent}
                        className="h-7 text-xs gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 px-2 font-medium"
                        title="Simulate attending +1 lecture across all subjects"
                      >
                        <Plus className="h-3 w-3" />
                        +1 All Subjects
                      </Button>

                      {hasAnySimulation && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetAllSimulations}
                          className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reset All
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: View Toggle & Search */}
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <div className="relative w-full sm:w-56">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search code, course, slot..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>

                    <div className="inline-flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/60 shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={`p-1.5 rounded-md transition-all ${
                          viewMode === "table"
                            ? "bg-background text-foreground shadow-xs border border-border/60"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="Table View"
                      >
                        <TableIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded-md transition-all ${
                          viewMode === "grid"
                            ? "bg-background text-foreground shadow-xs border border-border/60"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="Cards View"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter Tabs Row */}
                <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2 overflow-x-auto">
                  <Tabs value={filterTab} onValueChange={(val) => setFilterTab(val as any)} className="w-full">
                    <TabsList className="h-8 bg-muted/40 p-0.5 justify-start">
                      <TabsTrigger value="all" className="text-2xs sm:text-xs px-2.5 h-7">
                        All ({records.length})
                      </TabsTrigger>
                      <TabsTrigger value="danger" className="text-2xs sm:text-xs px-2.5 h-7 text-destructive data-[state=active]:text-destructive">
                        At Risk ({criticalCourses.length})
                      </TabsTrigger>
                      <TabsTrigger value="warning" className="text-2xs sm:text-xs px-2.5 h-7 text-amber-600 dark:text-amber-400">
                        Edge ({warningCourses.length})
                      </TabsTrigger>
                      <TabsTrigger value="safe" className="text-2xs sm:text-xs px-2.5 h-7 text-emerald-600 dark:text-emerald-400">
                        Safe ({safeCourses.length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <span className="text-2xs text-muted-foreground whitespace-nowrap shrink-0 hidden sm:inline">
                    Showing {filteredAndSortedRecords.length} of {records.length}
                  </span>
                </div>
              </div>

              {/* TABLE VIEW (Primary Minimalist Mode) */}
              {viewMode === "table" && (
                <div className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="border-border/60 hover:bg-transparent">
                          <TableHead className="min-w-[200px] text-xs font-semibold whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSort("course_code")}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                            >
                              <span>Course</span>
                              <ArrowUpDown className="h-3 w-3 opacity-60" />
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[90px] text-xs font-semibold text-center whitespace-nowrap">
                            Slot
                          </TableHead>
                          <TableHead className="min-w-[120px] text-xs font-semibold text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSort("conducted_hours")}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                            >
                              <span>Hours</span>
                              <ArrowUpDown className="h-3 w-3 opacity-60" />
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[130px] text-xs font-semibold text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSort("attendance_percentage")}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                            >
                              <span>Percentage</span>
                              <ArrowUpDown className="h-3 w-3 opacity-60" />
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[130px] text-xs font-semibold text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleSort("margin")}
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                            >
                              <span>Target Margin</span>
                              <ArrowUpDown className="h-3 w-3 opacity-60" />
                            </button>
                          </TableHead>
                          <TableHead className="min-w-[150px] text-xs font-semibold text-right pr-4 whitespace-nowrap">
                            Planner
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedRecords.map((rec) => {
                          const {
                            pct,
                            cond,
                            att,
                            neededForTarget,
                            safeAllowanceForTarget,
                            isSimulated,
                            deltaAttended,
                            deltaConducted,
                          } = getSimulatedMetrics(rec, globalTarget);

                          const isDanger = pct < 75.0;
                          const isWarning = pct >= 75.0 && pct < 80.0;

                          return (
                            <TableRow
                              key={rec.id || rec.course_code}
                              className={`border-border/50 transition-colors ${
                                isDanger
                                  ? "bg-destructive/[0.03] hover:bg-destructive/[0.07]"
                                  : isWarning
                                  ? "bg-amber-500/[0.02] hover:bg-amber-500/[0.06]"
                                  : "hover:bg-muted/40"
                              }`}
                            >
                              {/* 1. Course Code & Title */}
                              <TableCell className="py-3 align-middle font-medium min-w-[200px]">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-xs text-foreground tracking-tight whitespace-nowrap">
                                      {rec.course_code}
                                    </span>
                                    {isSimulated && (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
                                        Simulated ({deltaAttended > 0 ? `+${deltaAttended}P` : ""}{deltaConducted - deltaAttended > 0 ? ` +${deltaConducted - deltaAttended}A` : ""})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground line-clamp-1" title={rec.course_name}>
                                    {rec.course_name}
                                  </div>
                                </div>
                              </TableCell>

                              {/* 2. Slot */}
                              <TableCell className="py-3 text-center align-middle whitespace-nowrap">
                                {rec.slot ? (
                                  <Badge variant="outline" className="text-2xs font-normal py-0 h-5 bg-muted/40 text-muted-foreground border-border/60">
                                    {rec.slot}
                                  </Badge>
                                ) : (
                                  <span className="text-2xs text-muted-foreground/50">—</span>
                                )}
                              </TableCell>

                              {/* 3. Hours (Attended / Conducted) */}
                              <TableCell className="py-3 text-center align-middle text-xs whitespace-nowrap font-mono tabular-nums">
                                <div className="font-semibold text-foreground">
                                  {att} <span className="font-normal text-muted-foreground font-sans">/ {cond} hrs</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {cond - att} absent
                                </div>
                              </TableCell>

                              {/* 4. Percentage & Mini Progress Bar */}
                              <TableCell className="py-3 text-center align-middle whitespace-nowrap">
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-baseline gap-1.5 tabular-nums">
                                    <span className={`text-sm font-black tracking-tight ${
                                      isDanger
                                        ? "text-destructive"
                                        : isWarning
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-emerald-600 dark:text-emerald-400"
                                    }`}>
                                      {pct}%
                                    </span>
                                    {isSimulated && (
                                      <span className="text-[10px] text-muted-foreground">
                                        ({rec.attendance_percentage}%)
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-16 sm:w-20">
                                    <Progress
                                      value={Math.min(100, pct)}
                                      className={`h-1.5 bg-muted ${
                                        isDanger
                                          ? "[&>div]:bg-destructive"
                                          : isWarning
                                          ? "[&>div]:bg-amber-500"
                                          : "[&>div]:bg-emerald-500"
                                      }`}
                                    />
                                  </div>
                                </div>
                              </TableCell>

                              {/* 5. Target Margin */}
                              <TableCell className="py-3 text-center align-middle whitespace-nowrap">
                                {neededForTarget > 0 ? (
                                  <Badge variant="outline" className="text-2xs font-semibold py-0.5 px-2 bg-destructive/10 text-destructive border-destructive/30 gap-1 inline-flex whitespace-nowrap">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    Need {neededForTarget} cls
                                  </Badge>
                                ) : safeAllowanceForTarget > 0 ? (
                                  <Badge variant="outline" className="text-2xs font-semibold py-0.5 px-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 inline-flex whitespace-nowrap">
                                    <ShieldCheck className="h-3 w-3 shrink-0" />
                                    {safeAllowanceForTarget} safe
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-2xs font-medium py-0.5 px-2 bg-muted/60 text-muted-foreground border-border/60 whitespace-nowrap">
                                    On Target
                                  </Badge>
                                )}
                              </TableCell>

                              {/* 6. Quick Planner Action Buttons (Stable Layout) */}
                              <TableCell className="py-3 text-right align-middle pr-4 whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-1">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => adjustSim(rec.course_code, true)}
                                          className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-2xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all"
                                          aria-label="Simulate attending next class"
                                        >
                                          <Plus className="h-3 w-3" />
                                          <span>Present</span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Simulate +1 Present (+1 attended hr)</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => adjustSim(rec.course_code, false)}
                                          className="h-7 px-2 rounded-md inline-flex items-center gap-1 text-2xs font-semibold bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-95 transition-all"
                                          aria-label="Simulate missing next class"
                                        >
                                          <Minus className="h-3 w-3" />
                                          <span>Absent</span>
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">Simulate +1 Absent (+0 attended hr)</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {/* Fixed-width reset container to eliminate layout shift */}
                                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                    {isSimulated ? (
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={() => adjustSim(rec.course_code, false, true)}
                                              className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
                                              aria-label="Reset simulation"
                                            >
                                              <RotateCcw className="h-3 w-3" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="top">Reset course simulation</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    ) : null}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* CARDS VIEW (Optional Grid Layout) */}
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filteredAndSortedRecords.map((rec) => {
                    const {
                      pct,
                      cond,
                      att,
                      neededForTarget,
                      safeAllowanceForTarget,
                      isSimulated,
                      deltaAttended,
                      deltaConducted,
                    } = getSimulatedMetrics(rec, globalTarget);

                    const isDanger = pct < 75.0;
                    const isWarning = pct >= 75.0 && pct < 80.0;

                    return (
                      <div
                        key={rec.id || rec.course_code}
                        className={`p-4 rounded-xl border transition-all bg-card shadow-xs ${
                          isDanger
                            ? "border-destructive/30 bg-destructive/[0.02]"
                            : isWarning
                            ? "border-amber-500/30 bg-amber-500/[0.02]"
                            : "border-border/70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="font-bold text-xs text-foreground">{rec.course_code}</span>
                              {rec.slot && (
                                <Badge variant="outline" className="text-2xs py-0 h-4 bg-muted/40">
                                  {rec.slot}
                                </Badge>
                              )}
                              {isSimulated && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                  Simulated ({deltaAttended > 0 ? `+${deltaAttended}P` : ""}{deltaConducted - deltaAttended > 0 ? ` +${deltaConducted - deltaAttended}A` : ""})
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-xs text-foreground line-clamp-1" title={rec.course_name}>
                              {rec.course_name}
                            </h3>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-xl font-black tracking-tight ${
                              isDanger ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {pct}%
                            </div>
                            {isSimulated && (
                              <div className="text-[10px] text-muted-foreground">was {rec.attendance_percentage}%</div>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <Progress
                            value={Math.min(100, pct)}
                            className={`h-1.5 bg-muted ${
                              isDanger ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                            }`}
                          />
                          <div className="flex justify-between text-2xs text-muted-foreground font-mono tabular-nums">
                            <span>{att} / {cond} hrs attended</span>
                            <span>{cond - att} absent</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                          <div className="text-xs">
                            {neededForTarget > 0 ? (
                              <span className="text-2xs font-semibold text-destructive inline-flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Need {neededForTarget} class{neededForTarget === 1 ? "" : "es"}
                              </span>
                            ) : safeAllowanceForTarget > 0 ? (
                              <span className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                                <ShieldCheck className="h-3 w-3" /> {safeAllowanceForTarget} safe leave{safeAllowanceForTarget === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span className="text-2xs text-muted-foreground">On target</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => adjustSim(rec.course_code, true)}
                              className="h-7 text-2xs px-2.5 gap-1 bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium active:scale-95 transition-all"
                            >
                              <Plus className="h-3 w-3" /> Present
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => adjustSim(rec.course_code, false)}
                              className="h-7 text-2xs px-2.5 gap-1 bg-destructive/5 hover:bg-destructive/15 border-destructive/30 text-destructive font-medium active:scale-95 transition-all"
                            >
                              <Minus className="h-3 w-3" /> Absent
                            </Button>
                            <div className="w-7 h-7 flex items-center justify-center shrink-0">
                              {isSimulated ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => adjustSim(rec.course_code, false, true)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                                  title="Reset course simulation"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Filter Empty State */}
              {filteredAndSortedRecords.length === 0 && (
                <div className="text-center py-10 border border-dashed rounded-xl p-6 bg-muted/15">
                  <p className="text-xs sm:text-sm text-muted-foreground">No subjects match the selected filter or search query.</p>
                  <Button variant="ghost" size="sm" onClick={() => { setFilterTab("all"); setSearchQuery(""); }} className="mt-2 text-xs h-8">
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* Minimalist FAQ Accordion */}
              <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 shadow-xs space-y-2 mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-primary" />
                  <h3 className="text-xs sm:text-sm font-bold text-foreground">SRM University-AP Regulations & Automation</h3>
                </div>

                <details className="group border border-border/50 rounded-lg p-3 text-xs transition-colors [&[open]]:bg-muted/20">
                  <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                    <span>What is the mandatory 75% attendance rule at SRM AP?</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                  </summary>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    Under academic regulations at SRM University-AP, students must maintain a minimum of 75% attendance in each registered course to be eligible to appear for end-semester examinations. Falling below 75% leads to attendance condonation fines or semester detention.
                  </p>
                </details>

                <details className="group border border-border/50 rounded-lg p-3 text-xs transition-colors [&[open]]:bg-muted/20">
                  <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                    <span>How does the automated daily sync work?</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                  </summary>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    Our backend runs an automated background sync every <strong>Monday through Friday at 5:30 PM IST</strong>, skipping weekends and official university holidays. If any course drops below 75%, an instant warning notification is dispatched to your notification bell.
                  </p>
                </details>

                <details className="group border border-border/50 rounded-lg p-3 text-xs transition-colors [&[open]]:bg-muted/20">
                  <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                    <span>How is my portal login credentials secured?</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                  </summary>
                  <p className="mt-2 text-muted-foreground leading-relaxed">
                    Your portal password is encrypted using high-grade <strong>AES-256-GCM encryption</strong> with a hardware security key. Plaintext passwords are never logged or stored directly in database rows.
                  </p>
                </details>
              </div>

            </div>
          )}

          {/* Re-link Portal Modal */}
          <ImportSrmPortalDialog
            open={portalDialogOpen}
            onOpenChange={setPortalDialogOpen}
            onSuccess={() => {
              fetchAttendance();
            }}
          />

        </div>
      </div>
    </>
  );
}
