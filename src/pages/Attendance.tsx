import { useState, useEffect, useMemo } from "react";
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
  HelpCircle,
  Info,
  Loader2,
  Plus,
  Minus,
  RotateCcw,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

export default function Attendance() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "danger" | "warning" | "safe">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [globalTarget, setGlobalTarget] = useState<number>(75);
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

  const getSimulatedMetrics = (rec: AttendanceRecord, targetPercentage: number = 75) => {
    const sim = simulations[rec.course_code] || { deltaAttended: 0, deltaConducted: 0 };
    const cond = Math.max(1, rec.conducted_hours + sim.deltaConducted);
    const att = Math.max(0, Math.min(cond, rec.attended_hours + sim.deltaAttended));
    const pct = Number(((att / cond) * 100).toFixed(2));
    
    let neededForTarget = 0;
    if (pct < targetPercentage && targetPercentage < 100) {
      neededForTarget = Math.max(0, Math.ceil((targetPercentage * cond - 100 * att) / (100 - targetPercentage)));
    }

    let safeBunksForTarget = 0;
    if (pct >= targetPercentage && targetPercentage > 0) {
      safeBunksForTarget = Math.max(0, Math.floor((100 * att - targetPercentage * cond) / targetPercentage));
    }

    return {
      pct,
      cond,
      att,
      neededForTarget,
      safeBunksForTarget,
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

  const resetAllSimulations = () => {
    setSimulations({});
    toast.info("Reset all attendance simulations");
  };

  // Aggregates
  const totalAttended = records.reduce((acc, r) => acc + r.attended_hours, 0);
  const totalConducted = records.reduce((acc, r) => acc + r.conducted_hours, 0);
  const overallPct = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(2)) : 100;
  const criticalCourses = records.filter((r) => r.attendance_percentage < 75.0);
  const warningCourses = records.filter((r) => r.attendance_percentage >= 75.0 && r.attendance_percentage < 80.0);
  const safeCourses = records.filter((r) => r.attendance_percentage >= 80.0);
  const lastSync = records[0]?.last_synced_at;
  const totalSafeBunks = records.reduce((acc, r) => acc + (r.safe_bunks || 0), 0);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Filter by tab
      if (filterTab === "danger" && r.attendance_percentage >= 75.0) return false;
      if (filterTab === "warning" && (r.attendance_percentage < 75.0 || r.attendance_percentage >= 80.0)) return false;
      if (filterTab === "safe" && r.attendance_percentage < 80.0) return false;

      // Filter by search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = r.course_code.toLowerCase().includes(q);
        const nameMatch = r.course_name.toLowerCase().includes(q);
        const slotMatch = r.slot?.toLowerCase().includes(q) ?? false;
        return codeMatch || nameMatch || slotMatch;
      }
      return true;
    });
  }, [records, filterTab, searchQuery]);

  const hasAnySimulation = Object.keys(simulations).length > 0;

  return (
    <>
      <SEOHead
        title="SRM AP Attendance & Bunk Predictor | Friendly Learning"
        description="Track live course attendance from the SRM AP student portal, calculate safe bunks, get 75% shortage danger alerts, and simulate what-if scenarios."
      />

      <div className="min-h-screen bg-background pb-16 pt-6">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6">
          
          {/* Top Breadcrumb & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/profile" className="hover:text-foreground transition-colors">Profile</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="text-foreground font-medium">Attendance & Bunk Predictor</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                <GraduationCap className="h-7 w-7 text-primary shrink-0" />
                Attendance & Bunk Predictor
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Live SRM University-AP attendance tracker • 75% cutoff threshold alerts • What-If Bunk Simulator
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {records.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="gap-2 h-9 text-xs"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing..." : "Sync SRM Portal"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPortalDialogOpen(true)}
                    className="gap-1.5 h-9 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Re-link Portal
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <Card className="border-border/60">
              <CardContent className="p-12 flex items-center justify-center min-h-[300px]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground text-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="font-medium text-foreground">Fetching live attendance records...</p>
                  <p className="text-xs text-muted-foreground">Connecting to your student profile</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty / Not Linked State */}
          {!isLoading && records.length === 0 && (
            <Card className="border-dashed border-border/80 bg-muted/20 shadow-sm">
              <CardContent className="p-8 sm:p-12 text-center max-w-xl mx-auto space-y-5">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <GraduationCap className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-foreground">No Attendance Data Linked Yet</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Connect your SRM AP Student Portal in 1 click to get real-time subject attendance, calculate how many classes you can safely bunk, and receive instant alerts before you fall below 75%.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    size="lg"
                    onClick={() => setPortalDialogOpen(true)}
                    className="gap-2 font-semibold shadow-md px-6"
                  >
                    <Sparkles className="h-4 w-4" />
                    Link SRM Portal & Import Attendance
                  </Button>
                </div>

                <div className="pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  <div className="p-3 rounded-lg bg-card border border-border/50">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Auto 5:00 PM Sync
                    </div>
                    <p className="text-2xs text-muted-foreground">Runs every weekday, skipping weekends & campus holidays.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/50">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> 75% Cutoff Alerts
                    </div>
                    <p className="text-2xs text-muted-foreground">Instant bell notifications when any course is at risk.</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border border-border/50">
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
                      <Calculator className="h-3.5 w-3.5 text-primary" /> Bunk Simulator
                    </div>
                    <p className="text-2xs text-muted-foreground">Test what happens before skipping tomorrow's lecture.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Attendance Dashboard */}
          {!isLoading && records.length > 0 && (
            <div className="space-y-6">
              
              {/* Critical Shortage Warning Banner */}
              {criticalCourses.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-destructive/10 border border-destructive/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-destructive/20 text-destructive shrink-0 mt-0.5 sm:mt-0">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-destructive flex items-center gap-2">
                        Attendance Shortage Alert: {criticalCourses.length} Course{criticalCourses.length === 1 ? "" : "s"} Below 75%
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        SRM University-AP requires a minimum of 75% attendance to be eligible for end-semester examinations. Check recovery recommendations below.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setFilterTab("danger")}
                    className="shrink-0 text-xs gap-1.5 self-end sm:self-auto"
                  >
                    View At-Risk Courses ({criticalCourses.length})
                  </Button>
                </div>
              )}

              {/* Top Analytics Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Overall Percentage */}
                <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Overall Attendance</span>
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </CardDescription>
                    <div className="flex items-baseline justify-between mt-1">
                      <CardTitle className={`text-3xl font-extrabold tracking-tight ${
                        overallPct < 75
                          ? "text-destructive"
                          : overallPct < 80
                          ? "text-amber-500"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}>
                        {overallPct}%
                      </CardTitle>
                      <Badge variant={overallPct < 75 ? "destructive" : "outline"} className="text-2xs font-semibold">
                        {overallPct >= 75 ? "Safe Overall" : "Shortage"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1.5">
                      <Progress
                        value={Math.min(100, overallPct)}
                        className={`h-2 bg-muted ${
                          overallPct < 75
                            ? "[&>div]:bg-destructive"
                            : overallPct < 80
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-emerald-500"
                        }`}
                      />
                      <div className="flex justify-between text-2xs text-muted-foreground">
                        <span>{totalAttended} attended</span>
                        <span>{totalConducted} total hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 2. Critical Courses */}
                <Card className="border-border/60 shadow-sm bg-card">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Shortage Courses</span>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardDescription>
                    <div className="flex items-baseline justify-between mt-1">
                      <CardTitle className={`text-3xl font-extrabold tracking-tight ${criticalCourses.length > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {criticalCourses.length}
                      </CardTitle>
                      <Badge variant="outline" className="text-2xs text-muted-foreground">
                        &lt; 75% Cutoff
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      {criticalCourses.length === 0
                        ? "Great job! All your courses are above 75%."
                        : `${criticalCourses.map((c) => c.course_code).join(", ")} need immediate recovery.`}
                    </p>
                  </CardContent>
                </Card>

                {/* 3. Total Safe Bunks Available */}
                <Card className="border-border/60 shadow-sm bg-card">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Safe Bunk Margin</span>
                      <Zap className="h-4 w-4 text-emerald-500" />
                    </CardDescription>
                    <div className="flex items-baseline justify-between mt-1">
                      <CardTitle className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                        {totalSafeBunks}
                      </CardTitle>
                      <Badge variant="outline" className="text-2xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                        Bunks Available
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      Total lectures you can skip across safe courses while remaining &ge; 75%.
                    </p>
                  </CardContent>
                </Card>

                {/* 4. Sync Status */}
                <Card className="border-border/60 shadow-sm bg-card">
                  <CardHeader className="pb-2">
                    <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Auto-Sync Status</span>
                      <Clock className="h-4 w-4 text-primary" />
                    </CardDescription>
                    <div className="flex items-baseline justify-between mt-1">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {lastSync ? formatRelativeTime(lastSync) : "Recently"}
                      </div>
                      <Badge variant="outline" className="text-2xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Live
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">
                      Refreshes Mon–Fri at 5:00 PM IST (skips weekends & holidays).
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Target Goal & Simulation Bar */}
              <Card className="border-border/60 shadow-sm bg-muted/30">
                <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm text-foreground">Attendance Target Goal:</span>
                      <span className="font-extrabold text-primary text-base">{globalTarget}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select your desired threshold to calculate classes needed or safe bunks for that exact target.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 bg-background p-1 rounded-xl border border-border/60">
                      {TARGET_PRESETS.map((target) => (
                        <Button
                          key={target}
                          type="button"
                          variant={globalTarget === target ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setGlobalTarget(target)}
                          className="h-7 text-xs px-3 font-semibold rounded-lg"
                        >
                          {target}% {target === 75 ? "(Mandatory)" : target === 80 ? "(Safe)" : ""}
                        </Button>
                      ))}
                    </div>

                    {hasAnySimulation && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={resetAllSimulations}
                        className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset Simulations
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Course Filters & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <Tabs value={filterTab} onValueChange={(val) => setFilterTab(val as any)} className="w-full sm:w-auto">
                  <TabsList className="grid grid-cols-4 sm:flex h-9 bg-muted/60 p-1">
                    <TabsTrigger value="all" className="text-xs px-3 font-medium">
                      All ({records.length})
                    </TabsTrigger>
                    <TabsTrigger value="danger" className="text-xs px-3 font-medium text-destructive data-[state=active]:text-destructive">
                      At Risk ({criticalCourses.length})
                    </TabsTrigger>
                    <TabsTrigger value="warning" className="text-xs px-3 font-medium text-amber-600 dark:text-amber-400">
                      Edge ({warningCourses.length})
                    </TabsTrigger>
                    <TabsTrigger value="safe" className="text-xs px-3 font-medium text-emerald-600 dark:text-emerald-400">
                      Safe ({safeCourses.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subject or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Course Cards List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecords.map((rec) => {
                  const {
                    pct,
                    cond,
                    att,
                    neededForTarget,
                    safeBunksForTarget,
                    isSimulated,
                    deltaAttended,
                    deltaConducted,
                  } = getSimulatedMetrics(rec, globalTarget);

                  const isDanger = pct < 75.0;
                  const isWarning = pct >= 75.0 && pct < 80.0;
                  const isSafe = pct >= 80.0;

                  return (
                    <Card
                      key={rec.id || rec.course_code}
                      className={`transition-all overflow-hidden border ${
                        isDanger
                          ? "border-destructive/30 bg-destructive/[0.03] shadow-sm hover:border-destructive/50"
                          : isWarning
                          ? "border-amber-500/30 bg-amber-500/[0.03] shadow-sm hover:border-amber-500/50"
                          : "border-border/70 bg-card hover:border-border"
                      }`}
                    >
                      <CardHeader className="p-4 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge
                                variant={isDanger ? "destructive" : isWarning ? "outline" : "secondary"}
                                className="font-bold text-xs px-2 py-0.5"
                              >
                                {rec.course_code}
                              </Badge>
                              {rec.slot && (
                                <Badge variant="outline" className="text-2xs py-0 h-4 bg-muted/60">
                                  Slot {rec.slot}
                                </Badge>
                              )}
                              {isSimulated && (
                                <Badge variant="outline" className="text-2xs py-0 h-4 bg-primary/10 text-primary border-primary/30 animate-pulse font-semibold">
                                  Simulated ({deltaConducted > 0 ? `+${deltaConducted} cls` : ""})
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-semibold text-sm text-foreground line-clamp-1" title={rec.course_name}>
                              {rec.course_name}
                            </h3>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`text-2xl font-black tracking-tight ${
                              isDanger
                                ? "text-destructive"
                                : isWarning
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}>
                              {pct}%
                            </div>
                            {isSimulated && (
                              <div className="text-2xs font-medium text-muted-foreground">
                                was {rec.attendance_percentage}%
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 pt-0 space-y-3.5">
                        {/* Progress Bar with 75% Pin */}
                        <div className="space-y-1">
                          <div className="relative pt-2">
                            <Progress
                              value={Math.min(100, pct)}
                              className={`h-2.5 bg-muted ${
                                isDanger
                                  ? "[&>div]:bg-destructive"
                                  : isWarning
                                  ? "[&>div]:bg-amber-500"
                                  : "[&>div]:bg-emerald-500"
                              }`}
                            />
                            {/* 75% cutoff indicator marker */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-foreground/60 z-10"
                              style={{ left: "75%" }}
                              title="75% SRM Mandatory Minimum"
                            >
                              <span className="absolute -top-1.5 -translate-x-1/2 text-[9px] font-bold text-foreground/70 bg-background px-0.5 rounded">
                                75%
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between text-2xs text-muted-foreground pt-1">
                            <span>Attended: <strong className="text-foreground">{att}</strong> / {cond} hrs</span>
                            <span>Absent: <strong className="text-foreground">{cond - att}</strong> hrs</span>
                          </div>
                        </div>

                        {/* Status / Recovery Pill */}
                        <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
                          isDanger
                            ? "bg-destructive/10 text-destructive border border-destructive/20"
                            : isWarning
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {isDanger ? (
                              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                            ) : (
                              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                            )}
                            <span className="font-medium truncate">
                              {neededForTarget > 0 ? (
                                <>Need <strong>{neededForTarget}</strong> consecutive class{neededForTarget === 1 ? "" : "es"} for {globalTarget}%</>
                              ) : (
                                <>Can safely bunk <strong>{safeBunksForTarget}</strong> class{safeBunksForTarget === 1 ? "" : "es"} at {globalTarget}%</>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Interactive What-If Simulator Controls */}
                        <div className="pt-2 border-t border-border/40 flex items-center justify-between gap-2">
                          <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
                            What-If Simulator:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => adjustSim(rec.course_code, true)}
                                    className="h-7 text-xs px-2.5 gap-1 bg-emerald-500/5 hover:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-medium"
                                  >
                                    <Plus className="h-3 w-3" /> Attend +1
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Simulate attending next class</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => adjustSim(rec.course_code, false)}
                                    className="h-7 text-xs px-2.5 gap-1 bg-destructive/5 hover:bg-destructive/15 border-destructive/30 text-destructive font-medium"
                                  >
                                    <Minus className="h-3 w-3" /> Miss +1
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Simulate skipping next class</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {isSimulated && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => adjustSim(rec.course_code, false, true)}
                                      className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Reset course simulation</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {filteredRecords.length === 0 && (
                <div className="text-center py-12 border border-dashed rounded-xl p-8 bg-muted/20">
                  <p className="text-sm text-muted-foreground">No courses match the current filter or search query.</p>
                  <Button variant="ghost" size="sm" onClick={() => { setFilterTab("all"); setSearchQuery(""); }} className="mt-2 text-xs">
                    Clear Filters
                  </Button>
                </div>
              )}

              {/* FAQ & Policy Accordion */}
              <Card className="border-border/60 shadow-sm mt-8">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    SRM University-AP Attendance Guidelines & Automation Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2.5">
                  <details className="group border border-border/50 rounded-xl p-3 text-xs transition-colors [&[open]]:bg-muted/20">
                    <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                      <span>What is the mandatory 75% attendance rule at SRM AP?</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                    </summary>
                    <p className="mt-2.5 text-muted-foreground leading-relaxed">
                      Under academic regulations at SRM University-AP, students must maintain a minimum of 75% attendance in each registered course to be eligible to appear for end-semester examinations. Falling below 75% leads to attendance condonation fines or semester detention.
                    </p>
                  </details>

                  <details className="group border border-border/50 rounded-xl p-3 text-xs transition-colors [&[open]]:bg-muted/20">
                    <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                      <span>How does the automated daily sync work?</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                    </summary>
                    <p className="mt-2.5 text-muted-foreground leading-relaxed">
                      Our backend runs an automated background sync every <strong>Monday through Friday at 5:00 PM IST</strong>. It automatically skips Saturdays, Sundays, and official university holidays. If any course drops below 75%, an instant warning notification is triggered to your header bell and mobile device.
                    </p>
                  </details>

                  <details className="group border border-border/50 rounded-xl p-3 text-xs transition-colors [&[open]]:bg-muted/20">
                    <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                      <span>How is my portal login credentials kept secure?</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                    </summary>
                    <p className="mt-2.5 text-muted-foreground leading-relaxed">
                      Your portal password is encrypted using high-grade <strong>AES-256-GCM encryption</strong> with a hardware security key. Plaintext passwords are never logged, stored in databases, or viewable by anyone.
                    </p>
                  </details>
                </CardContent>
              </Card>

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
