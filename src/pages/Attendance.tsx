import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronRight,
  GraduationCap,
  Info,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

type SortField = "course_code" | "attendance_percentage" | "conducted_hours" | "margin";
type SortDirection = "asc" | "desc";
type FilterTab = "all" | "risk" | "safe";

export default function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
  const lastSync = records[0]?.last_synced_at;
  const totalSafeAllowance = records.reduce((acc, r) => acc + (r.safe_bunks || 0), 0);

  const filteredAndSortedRecords = useMemo(() => {
    const list = records.filter((r) => {
      if (filterTab === "risk" && r.attendance_percentage >= 75.0) return false;
      if (filterTab === "safe" && r.attendance_percentage < 75.0) return false;

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

        {/* Plain Header */}
        <div className="border-b border-border/60">
          <div className="container max-w-5xl mx-auto px-4 sm:px-6 pb-6 pt-20 sm:pt-22">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Breadcrumb row */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                <Link to="/profile" className="hover:text-foreground transition-colors">Profile</Link>
                <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                <span className="text-foreground font-medium">Attendance</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Attendance
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Live from the SRM AP student portal · 75% examination eligibility threshold
                  </p>
                </div>

                {records.length > 0 && (
                  <div className="flex items-center gap-3 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="gap-2 h-8 text-xs font-medium"
                    >
                      <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                      {isSyncing ? "Syncing…" : "Sync"}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setPortalDialogOpen(true)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    >
                      Re-link portal
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-6">

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground text-sm min-h-[240px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading attendance records…</p>
            </div>
          )}

          {/* Empty / Not Linked State */}
          {!isLoading && records.length === 0 && (
            <div className="border border-dashed border-border/80 rounded-xl py-14 px-6 text-center max-w-lg mx-auto space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-foreground">No attendance linked yet</h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Connect your SRM AP student portal to see subject-wise attendance, your safe leave buffer above 75%, and eligibility alerts — synced automatically on weekdays.
                </p>
              </div>
              <Button
                size="default"
                onClick={() => setPortalDialogOpen(true)}
                className="gap-2 font-semibold px-5 h-10"
              >
                <Sparkles className="h-4 w-4" />
                Link SRM Portal
              </Button>
            </div>
          )}

          {/* Main Attendance Dashboard */}
          {!isLoading && records.length > 0 && (
            <div className="space-y-5">

              {/* Shortage Alert (slim) */}
              {criticalCourses.length > 0 && (
                <div className="pl-3 border-l-2 border-destructive py-1 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-destructive font-semibold">
                      {criticalCourses.length} subject{criticalCourses.length === 1 ? "" : "s"} below 75%
                    </span>
                  </div>
                  <div className="mt-0.5 pl-6 text-muted-foreground">
                    {criticalCourses.map((c) => `${c.course_code} (${c.attendance_percentage}%)`).join(", ")}
                  </div>
                </div>
              )}

              {/* Stat Strip */}
              <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/60 sm:divide-y-0 sm:divide-x sm:flex">
                <div className="flex-1 p-4 sm:p-5">
                  <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Overall</div>
                  <div className={`mt-1 text-2xl sm:text-3xl font-bold tracking-tight ${
                    overallPct < 75 ? "text-destructive" : overallPct < 80 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {overallPct}%
                  </div>
                  <Progress
                    value={Math.min(100, overallPct)}
                    className={`mt-2 h-1 bg-muted ${
                      overallPct < 75 ? "[&>div]:bg-destructive" : overallPct < 80 ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                    }`}
                  />
                  <div className="mt-1.5 text-2xs text-muted-foreground">{totalAttended} / {totalConducted} hrs</div>
                </div>

                <div className="flex-1 p-4 sm:p-5">
                  <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">At risk</div>
                  <div className={`mt-1 text-2xl sm:text-3xl font-bold tracking-tight ${criticalCourses.length > 0 ? "text-destructive" : "text-foreground"}`}>
                    {criticalCourses.length}
                  </div>
                  <div className="mt-1.5 text-2xs text-muted-foreground">
                    {criticalCourses.length === 0 ? "all subjects clear 75%" : "below 75% cutoff"}
                  </div>
                </div>

                <div className="flex-1 p-4 sm:p-5">
                  <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Safe buffer</div>
                  <div className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                    {totalSafeAllowance}
                  </div>
                  <div className="mt-1.5 text-2xs text-muted-foreground">classes above 75%, combined</div>
                </div>

                <div className="flex-1 p-4 sm:p-5">
                  <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Last synced</div>
                  <div className="mt-1 text-lg sm:text-xl font-bold tracking-tight text-foreground">
                    {lastSync ? formatRelativeTime(lastSync) : "Never"}
                  </div>
                  <div className="mt-1.5 text-2xs text-muted-foreground">auto-syncs Mon–Fri, 5:30 PM IST</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">

                {/* Left: Filter tabs */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <Tabs value={filterTab} onValueChange={(val) => setFilterTab(val as FilterTab)}>
                    <TabsList className="h-8 bg-muted/40 p-0.5">
                      <TabsTrigger value="all" className="text-xs px-2.5 h-7">All ({records.length})</TabsTrigger>
                      <TabsTrigger value="risk" className="text-xs px-2.5 h-7 data-[state=active]:text-destructive">
                        At risk ({criticalCourses.length})
                      </TabsTrigger>
                      <TabsTrigger value="safe" className="text-xs px-2.5 h-7 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400">
                        Safe ({records.length - criticalCourses.length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {hasAnySimulation && (
                    <button
                      type="button"
                      onClick={resetAllSimulations}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset simulation
                    </button>
                  )}
                </div>

                {/* Right: Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search course, slot, faculty…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                        <TableHead className="min-w-[240px] text-xs font-semibold whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort("course_code")}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <span>Course & Faculty</span>
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          </button>
                        </TableHead>
                        <TableHead className="min-w-[110px] text-xs font-semibold text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort("conducted_hours")}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                          >
                            <span>Hours</span>
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          </button>
                        </TableHead>
                        <TableHead className="min-w-[130px] text-xs font-semibold text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort("attendance_percentage")}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                          >
                            <span>Attendance</span>
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          </button>
                        </TableHead>
                        <TableHead className="min-w-[130px] text-xs font-semibold text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSort("margin")}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                          >
                            <span>75% Margin</span>
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          </button>
                        </TableHead>
                        <TableHead className="min-w-[90px] text-xs font-semibold text-right pr-4 whitespace-nowrap">
                          Simulate
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
                        } = getSimulatedMetrics(rec, 75);

                        const isDanger = pct < 75.0;
                        const isWarning = pct >= 75.0 && pct < 80.0;
                        const statusColor = isDanger ? "border-l-destructive" : isWarning ? "border-l-amber-500" : "border-l-emerald-500";
                        const displayedAbsent = isSimulated ? (cond - att) : rec.absent_hours;

                        return (
                          <TableRow key={rec.id || rec.course_code} className="border-border/40 hover:bg-muted/30 transition-colors">
                            {/* 1. Course & Faculty */}
                            <TableCell className={`py-3.5 align-middle border-l-3 ${statusColor}`}>
                              <div className="pl-2 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-foreground tracking-tight">
                                    {rec.course_code}
                                  </span>
                                  {rec.slot && /^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/i.test(rec.slot.trim()) && (
                                    <span className="inline-flex items-center text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                                      {rec.slot}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground font-medium line-clamp-1" title={rec.course_name}>
                                  {rec.course_name}
                                </div>
                                {rec.faculty_name && (
                                  <div className="flex items-center gap-1 pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/90 bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 font-medium">
                                      <UserCheck className="h-3 w-3 text-primary/70 shrink-0" />
                                      <span className="truncate max-w-[220px]" title={rec.faculty_name}>
                                        {rec.faculty_name}
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            {/* 2. Hours */}
                            <TableCell className="py-3.5 text-center align-middle text-xs whitespace-nowrap font-mono tabular-nums">
                              <div className="font-bold text-foreground text-sm tracking-tight">
                                {att}<span className="font-normal text-muted-foreground text-xs font-sans">/{cond} hrs</span>
                              </div>
                              <div className="text-2xs text-muted-foreground mt-0.5">
                                <span className={displayedAbsent > 0 ? "text-destructive/80 font-medium" : "text-muted-foreground"}>
                                  {displayedAbsent} absent
                                </span>
                              </div>
                            </TableCell>

                            {/* 3. Percentage */}
                            <TableCell className="py-3.5 text-center align-middle whitespace-nowrap">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-sm font-black tracking-tight ${
                                  isDanger ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                                }`}>
                                  {pct}%
                                </span>
                                {isSimulated && (
                                  <span className="text-[10px] text-muted-foreground">was {rec.attendance_percentage}%</span>
                                )}
                                <div className="w-16">
                                  <Progress
                                    value={Math.min(100, pct)}
                                    className={`h-1.5 bg-muted ${
                                      isDanger ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                                    }`}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            {/* 4. Margin */}
                            <TableCell className="py-3.5 text-center align-middle whitespace-nowrap">
                              {neededForTarget > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
                                  <AlertTriangle className="h-3 w-3" /> Need {neededForTarget} cls
                                </span>
                              ) : safeAllowanceForTarget > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                  <ShieldCheck className="h-3 w-3" /> {safeAllowanceForTarget} safe
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground font-medium bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                                  On target
                                </span>
                              )}
                            </TableCell>

                            {/* 5. Planner / Simulation */}
                            <TableCell className="py-3.5 text-right align-middle pr-4 whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => adjustSim(rec.course_code, true)}
                                        className="h-7 w-7 rounded-md flex items-center justify-center text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20"
                                        aria-label="Simulate attending next class"
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Simulate +1 Present</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        type="button"
                                        onClick={() => adjustSim(rec.course_code, false)}
                                        className="h-7 w-7 rounded-md flex items-center justify-center text-destructive bg-destructive/10 hover:bg-destructive/20 active:scale-95 transition-all border border-destructive/20"
                                        aria-label="Simulate missing next class"
                                      >
                                        <Minus className="h-3.5 w-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Simulate +1 Absent</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                  {isSimulated ? (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() => adjustSim(rec.course_code, false, true)}
                                            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
                                            aria-label="Reset simulation"
                                          >
                                            <RotateCcw className="h-3 w-3" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">Reset</TooltipContent>
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

              {/* Filter Empty State */}
              {filteredAndSortedRecords.length === 0 && (
                <div className="text-center py-10 border border-dashed rounded-xl">
                  <p className="text-xs sm:text-sm text-muted-foreground">No subjects match the selected filter or search query.</p>
                  <Button variant="ghost" size="sm" onClick={() => { setFilterTab("all"); setSearchQuery(""); }} className="mt-2 text-xs h-8">
                    Clear filters
                  </Button>
                </div>
              )}

              {/* FAQ */}
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  <h3 className="text-xs font-semibold uppercase tracking-wide">Regulations & automation</h3>
                </div>

                <div className="divide-y divide-border/60 border-t border-border/60">
                  <details className="group py-3 text-xs">
                    <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                      <span>What is the mandatory 75% attendance rule at SRM AP?</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                    </summary>
                    <p className="mt-2 text-muted-foreground leading-relaxed">
                      Under academic regulations at SRM University-AP, students must maintain a minimum of 75% attendance in each registered course to be eligible to appear for end-semester examinations. Falling below 75% leads to attendance condonation fines or semester detention.
                    </p>
                  </details>

                  <details className="group py-3 text-xs">
                    <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2 text-foreground">
                      <span>How does the automated daily sync work?</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-open:rotate-90 shrink-0" />
                    </summary>
                    <p className="mt-2 text-muted-foreground leading-relaxed">
                      Our backend runs an automated background sync every <strong>Monday through Friday at 5:30 PM IST</strong>, skipping weekends and official university holidays. If any course drops below 75%, an instant warning notification is dispatched to your notification bell.
                    </p>
                  </details>

                  <details className="group py-3 text-xs">
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
