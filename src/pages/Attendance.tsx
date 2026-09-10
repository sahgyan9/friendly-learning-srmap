import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpDown,
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
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
import { getOfflineCache, setOfflineCache, formatOfflineTime } from "@/lib/offline/offlineStorage";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { getFacultyDirectoryUrl } from "@/integrations/supabase/services/faculty";
import { cn } from "@/lib/utils";
import WeeklyMatrixTable, { TimetableSlot } from "@/components/timetable/WeeklyMatrixTable";
import CourseFacultyDirectory from "@/components/timetable/CourseFacultyDirectory";
import ActiveScheduleBanner from "@/components/timetable/ActiveScheduleBanner";
import FeeFinanceOverview, { StudentFeeDue, StudentFeePaidHistory } from "@/components/finance/FeeFinanceOverview";

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

export interface StudentDailyAttendance {
  id: string;
  user_id: string;
  register_number: string;
  attendance_date: string;
  day_order: string;
  period_slot: number;
  course_code: string;
  course_name: string;
  status: string;
  last_synced_at: string;
}

type SortField = "course_code" | "attendance_percentage" | "conducted_hours" | "margin";
type SortDirection = "asc" | "desc";
type FilterTab = "all" | "risk" | "safe" | "today";

export default function Attendance() {
  const { user } = useAuth();
  const { isOnline } = useNetworkStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cachedTime, setCachedTime] = useState<number | null>(null);
  const [timetableCachedTime, setTimetableCachedTime] = useState<number | null>(null);
  const [financeCachedTime, setFinanceCachedTime] = useState<number | null>(null);

  const portalTabParam = searchParams.get("tab");
  const activePortalTab: "attendance" | "timetable" | "finance" =
    portalTabParam === "timetable"
      ? "timetable"
      : portalTabParam === "finance"
      ? "finance"
      : "attendance";
  const [activeCourseCode, setActiveCourseCode] = useState<string | null>(null);

  // Initialize records from offline cache immediately if available
  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    if (user?.id) {
      const cached = getOfflineCache<AttendanceRecord[]>(`attendance:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data;
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (user?.id) {
      const cached = getOfflineCache<AttendanceRecord[]>(`attendance:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return false;
      }
    }
    return true;
  });

  // Initialize timetable slots from offline cache
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlot[]>(() => {
    if (user?.id) {
      const cached = getOfflineCache<TimetableSlot[]>(`timetable:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data;
      }
    }
    return [];
  });

  const [isTimetableLoading, setIsTimetableLoading] = useState(() => {
    if (user?.id) {
      const cached = getOfflineCache<TimetableSlot[]>(`timetable:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return false;
      }
    }
    return true;
  });

  // Initialize fee dues from offline cache
  const [feeDues, setFeeDues] = useState<StudentFeeDue[]>(() => {
    if (user?.id) {
      const cached = getOfflineCache<StudentFeeDue[]>(`finance_dues:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data;
      }
    }
    return [];
  });

  // Initialize fee paid history from offline cache
  const [feePaidHistory, setFeePaidHistory] = useState<StudentFeePaidHistory[]>(() => {
    if (user?.id) {
      const cached = getOfflineCache<StudentFeePaidHistory[]>(`finance_history:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data;
      }
    }
    return [];
  });

  const [isFinanceLoading, setIsFinanceLoading] = useState(() => {
    if (user?.id) {
      const cached = getOfflineCache<StudentFeeDue[]>(`finance_dues:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return false;
      }
    }
    return true;
  });

  // Initialize today's daily attendance from offline cache
  const [dailyAttendance, setDailyAttendance] = useState<StudentDailyAttendance[]>(() => {
    if (user?.id) {
      const cached = getOfflineCache<StudentDailyAttendance[]>(`daily_attendance:${user.id}`);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data;
      }
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("attendance_percentage");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [simulations, setSimulations] = useState<Record<string, { deltaAttended: number; deltaConducted: number }>>({});

  const handleTabChange = (tab: "attendance" | "timetable" | "finance") => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (tab === "attendance") {
          next.delete("tab");
        } else {
          next.set("tab", tab);
        }
        return next;
      },
      { replace: true }
    );
  };

  const fetchAttendance = async () => {
    if (!user) return;

    // Load from offline cache first
    const cached = getOfflineCache<AttendanceRecord[]>(`attendance:${user.id}`);
    if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
      setRecords(cached.data);
      setCachedTime(cached.savedAt);
      setIsLoading(false);
    }

    // If completely offline, don't perform network fetch
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsLoading(false);
      return;
    }

    if (records.length === 0) {
      setIsLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("student_attendance" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("attendance_percentage", { ascending: true });

      if (error) {
        console.error("Error fetching student attendance:", error);
      } else {
        const freshRecords = (data as unknown as AttendanceRecord[]) || [];
        setRecords(freshRecords);
        setOfflineCache(`attendance:${user.id}`, freshRecords);
        setCachedTime(Date.now());
      }
    } catch (err) {
      console.error("Failed to load attendance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimetable = async () => {
    if (!user) return;

    // Load from offline cache first
    const cached = getOfflineCache<TimetableSlot[]>(`timetable:${user.id}`);
    if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
      setTimetableSlots(cached.data);
      setTimetableCachedTime(cached.savedAt);
      setIsTimetableLoading(false);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsTimetableLoading(false);
      return;
    }

    if (timetableSlots.length === 0) {
      setIsTimetableLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("student_timetables" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("day_order", { ascending: true })
        .order("hour", { ascending: true });

      if (error) {
        console.error("Error fetching student timetable:", error);
      } else {
        const freshSlots = (data as unknown as TimetableSlot[]) || [];
        setTimetableSlots(freshSlots);
        setOfflineCache(`timetable:${user.id}`, freshSlots);
        setTimetableCachedTime(Date.now());
      }
    } catch (err) {
      console.error("Failed to load timetable:", err);
    } finally {
      setIsTimetableLoading(false);
    }
  };

  const fetchFinance = async () => {
    if (!user) return;

    // Load from offline cache first
    const cachedDues = getOfflineCache<StudentFeeDue[]>(`finance_dues:${user.id}`);
    const cachedHistory = getOfflineCache<StudentFeePaidHistory[]>(`finance_history:${user.id}`);
    if (cachedDues?.data && Array.isArray(cachedDues.data) && cachedDues.data.length > 0) {
      setFeeDues(cachedDues.data);
      setFinanceCachedTime(cachedDues.savedAt);
      setIsFinanceLoading(false);
    }
    if (cachedHistory?.data && Array.isArray(cachedHistory.data) && cachedHistory.data.length > 0) {
      setFeePaidHistory(cachedHistory.data);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsFinanceLoading(false);
      return;
    }

    if (feeDues.length === 0 && feePaidHistory.length === 0) {
      setIsFinanceLoading(true);
    }

    try {
      const [duesRes, historyRes] = await Promise.all([
        supabase
          .from("student_fee_dues")
          .select("*")
          .eq("user_id", user.id)
          .order("to_be_paid_amount", { ascending: false }),
        supabase
          .from("student_fee_paid_history")
          .select("*")
          .eq("user_id", user.id)
          .order("term", { ascending: false })
          .order("created_at", { ascending: false }),
      ]);

      if (duesRes.data) {
        setFeeDues(duesRes.data);
        setOfflineCache(`finance_dues:${user.id}`, duesRes.data);
        setFinanceCachedTime(Date.now());
      }
      if (historyRes.data) {
        setFeePaidHistory(historyRes.data);
        setOfflineCache(`finance_history:${user.id}`, historyRes.data);
      }
    } catch (err) {
      console.error("Failed to load finance records:", err);
    } finally {
      setIsFinanceLoading(false);
    }
  };

  const fetchDailyAttendance = async () => {
    if (!user) return;

    // Load from offline cache first
    const cached = getOfflineCache<StudentDailyAttendance[]>(`daily_attendance:${user.id}`);
    if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
      setDailyAttendance(cached.data);
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from("student_daily_attendance" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("attendance_date", { ascending: false })
        .order("period_slot", { ascending: true });

      if (!error && data) {
        const freshDaily = (data as unknown as StudentDailyAttendance[]) || [];
        setDailyAttendance(freshDaily);
        setOfflineCache(`daily_attendance:${user.id}`, freshDaily);
      }
    } catch (err) {
      console.error("Failed to load daily attendance:", err);
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchTimetable();
    fetchFinance();
    fetchDailyAttendance();
  }, [user]);

  // Revalidate on pull-to-refresh gesture
  useEffect(() => {
    const handlePullRefresh = () => {
      fetchAttendance();
      fetchTimetable();
      fetchFinance();
      fetchDailyAttendance();
    };
    window.addEventListener("fl:refresh", handlePullRefresh);
    return () => window.removeEventListener("fl:refresh", handlePullRefresh);
  }, [user]);

  // Cached data shows immediately while offline; refresh when connection returns
  useEffect(() => {
    const handleOnline = () => {
      fetchAttendance();
      fetchTimetable();
      fetchFinance();
      fetchDailyAttendance();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [user]);

  const handleManualSync = async () => {
    if (!user) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      toast.error("You are currently offline. Connect to the internet to sync portal data.");
      return;
    }

    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to sync portal data.");
        return;
      }

      const res = await supabase.functions.invoke("sync-srm-portal", {
        body: { user_id: user.id, force: true },
      });

      if (res.error || res.data?.error) {
        const errMsg = res.data?.error || res.error?.message || "Portal sync failed. Please verify your portal link.";
        toast.error(errMsg);
        if (res.data?.error?.includes("Re-link") || res.data?.error?.includes("No linked")) {
          setPortalDialogOpen(true);
        }
      } else {
        toast.success("SRM Portal synced successfully!");
        await Promise.all([fetchAttendance(), fetchTimetable(), fetchFinance(), fetchDailyAttendance()]);
      }
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("Failed to sync SRM Portal. Please try again.");
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
  const criticalCourses = records.filter((r) => r.attendance_percentage < 75.0);

  const latestAttendanceDate = useMemo(() => {
    if (dailyAttendance.length === 0) return null;
    return dailyAttendance[0].attendance_date;
  }, [dailyAttendance]);

  const todayAttendanceRecords = useMemo(() => {
    if (!latestAttendanceDate) return [];
    return dailyAttendance.filter((r) => r.attendance_date === latestAttendanceDate);
  }, [dailyAttendance, latestAttendanceDate]);

  const todayCourseStatusMap = useMemo(() => {
    const map = new Map<string, { status: "Present" | "Absent"; date: string }>();
    if (!todayAttendanceRecords.length) return map;

    const grouped = new Map<string, StudentDailyAttendance[]>();
    for (const item of todayAttendanceRecords) {
      const key = item.course_code.trim().toUpperCase().replace(/\s+/g, "");
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(item);
    }

    for (const [code, items] of grouped.entries()) {
      const hasAbsent = items.some((i) => i.status.toUpperCase() === "A");
      map.set(code, {
        status: hasAbsent ? "Absent" : "Present",
        date: items[0].attendance_date,
      });
    }
    return map;
  }, [todayAttendanceRecords]);

  const filteredAndSortedRecords = useMemo(() => {
    const list = records.filter((r) => {
      if (filterTab === "risk" && r.attendance_percentage >= 75.0) return false;
      if (filterTab === "safe" && r.attendance_percentage < 75.0) return false;
      if (filterTab === "today") {
        const normCode = r.course_code.trim().toUpperCase().replace(/\s+/g, "");
        if (!todayCourseStatusMap.has(normCode)) return false;
      }

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
  }, [records, filterTab, searchQuery, sortField, sortDirection, todayCourseStatusMap]);

  const hasAnySimulation = Object.keys(simulations).length > 0;
  const lastSync =
    records[0]?.last_synced_at ||
    timetableSlots[0]?.last_synced_at ||
    feeDues[0]?.last_synced_at ||
    dailyAttendance[0]?.last_synced_at;

  return (
    <>
      <SEOHead
        title={
          activePortalTab === "timetable"
            ? "Class Timetable | SRM Portal | Friendly Learning SRMAP"
            : activePortalTab === "finance"
            ? "Fee & Finance | SRM Portal | Friendly Learning SRMAP"
            : "Attendance & Bunk Predictor | SRM Portal | Friendly Learning SRMAP"
        }
        description={
          activePortalTab === "timetable"
            ? "View your SRM AP weekly class timetable, period timings 1 to 8, classroom numbers, and faculty details."
            : activePortalTab === "finance"
            ? "Track your SRM AP fee dues, avoid penalty of fine, check payment history, and view receipts."
            : "Track live course attendance from the SRM AP student portal, monitor 75% examination eligibility thresholds, and plan upcoming classes."
        }
      />

      <div className="min-h-screen bg-background pb-28 sm:pb-16">

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
                <span className="text-foreground font-medium">SRM Portal</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    SRM Portal
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Live from the SRM AP student portal · Attendance, timetable & fee dues
                  </p>
                </div>

                {(records.length > 0 || timetableSlots.length > 0 || feeDues.length > 0) && (
                  <div className="flex items-center gap-3 bg-card/80 dark:bg-card/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/70 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      {isOnline ? (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground tracking-tight leading-tight">
                              Synced {lastSync ? formatRelativeTime(lastSync) : "Never"}
                            </span>
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              Auto-syncs Mon–Fri, 5:30 PM IST
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="relative flex h-2 w-2">
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 tracking-tight leading-tight">
                              Offline Mode
                            </span>
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              Saved {cachedTime ? formatOfflineTime(cachedTime) : (timetableCachedTime ? formatOfflineTime(timetableCachedTime) : (financeCachedTime ? formatOfflineTime(financeCachedTime) : (lastSync ? formatRelativeTime(lastSync) : "locally")))}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="h-6 w-px bg-border/70 mx-0.5" />

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleManualSync}
                        disabled={isSyncing || !isOnline}
                        className="h-7 px-2.5 text-xs font-medium hover:bg-muted/80 text-foreground gap-1.5 rounded-lg transition-colors"
                        title={isOnline ? "Fetch latest portal data from SRM portal" : "Connect to internet to sync"}
                      >
                        <RefreshCw className={`h-3 w-3 text-primary ${isSyncing ? "animate-spin" : ""}`} />
                        <span>{isSyncing ? "Syncing…" : "Sync"}</span>
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!isOnline) {
                            toast.error("Connect to internet to update portal credentials");
                            return;
                          }
                          setPortalDialogOpen(true);
                        }}
                        disabled={!isOnline}
                        className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 transition-colors rounded-lg hover:bg-muted/60 disabled:opacity-50"
                        title="Update portal credentials"
                      >
                        Re-link
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container max-w-5xl mx-auto px-4 sm:px-6 pt-6">

          {/* Global Empty / Not Linked State */}
          {!isLoading && !isTimetableLoading && !isFinanceLoading && records.length === 0 && timetableSlots.length === 0 && feeDues.length === 0 && (
            <div className="border border-dashed border-border/80 rounded-xl py-14 px-6 text-center max-w-lg mx-auto space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-foreground">No SRM Portal linked yet</h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Connect your SRM AP student portal to see subject-wise attendance, your safe leave buffer above 75%, weekly class timetable, and fee dues with penalty alerts — synced automatically.
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

          {/* Segmented Tab Switcher */}
          {(records.length > 0 || timetableSlots.length > 0 || feeDues.length > 0 || isLoading || isTimetableLoading || isFinanceLoading) && (
            <div className="flex items-center gap-1.5 p-1 bg-muted/40 border border-border/60 rounded-xl w-fit mb-6 overflow-x-auto max-w-full scrollbar-none touch-pan-x">
              <button
                type="button"
                onClick={() => handleTabChange("attendance")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                  activePortalTab === "attendance"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>Attendance & Bunk Calculator</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("timetable")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                  activePortalTab === "timetable"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>Class Timetable</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("finance")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                  activePortalTab === "finance"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Fee & Finance</span>
                {feeDues.some((d) => d.to_be_paid_amount > 0) && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                )}
              </button>
            </div>
          )}

          {/* Tab 1: Attendance Dashboard */}
          {activePortalTab === "attendance" && (
            <>
              {isLoading && records.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground text-sm min-h-[240px]">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs">Loading attendance records…</p>
                </div>
              )}

              {!isLoading && records.length === 0 && timetableSlots.length > 0 && (
                <div className="border border-dashed border-border/80 rounded-xl py-12 px-6 text-center max-w-md mx-auto space-y-3">
                  <h3 className="text-base font-semibold text-foreground">No attendance records found</h3>
                  <p className="text-xs text-muted-foreground">
                    Click "Sync" above to fetch your latest attendance records from the portal.
                  </p>
                </div>
              )}

              {records.length > 0 && (
                <div className="space-y-4">

              {/* Shortage Alert (slim banner) */}
              {criticalCourses.length > 0 && (
                <div className="flex items-center justify-between gap-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-2.5 text-xs sm:text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />
                    <span>
                      <strong>{criticalCourses.length} subject{criticalCourses.length === 1 ? "" : "s"} below 75%</strong> ({criticalCourses.map((c) => `${c.course_code}: ${c.attendance_percentage}%`).join(", ")})
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold bg-destructive/20 px-2 py-0.5 rounded-md shrink-0">
                    Needs attention
                  </span>
                </div>
              )}

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
                      {todayCourseStatusMap.size > 0 && (
                        <TabsTrigger value="today" className="text-xs px-2.5 h-7 data-[state=active]:text-primary font-medium">
                          Today ({todayCourseStatusMap.size})
                        </TabsTrigger>
                      )}
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

              {/* Desktop & Tablet Table (compacted for 100% single view without horizontal scroll) */}
              <div className="hidden sm:block rounded-xl border border-border/60 bg-card overflow-hidden shadow-xs">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent bg-muted/20">
                      <TableHead className="w-[38%] min-w-[170px] text-xs font-semibold whitespace-nowrap px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort("course_code")}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <span>Course & Faculty</span>
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[14%] min-w-[70px] text-xs font-semibold text-center whitespace-nowrap px-2 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort("conducted_hours")}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                        >
                          <span>Hours</span>
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[16%] min-w-[85px] text-xs font-semibold text-center whitespace-nowrap px-2 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort("attendance_percentage")}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                        >
                          <span>Attendance</span>
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[17%] min-w-[85px] text-xs font-semibold text-center whitespace-nowrap px-2 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleSort("margin")}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors mx-auto"
                        >
                          <span>75% Margin</span>
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[15%] min-w-[75px] text-xs font-semibold text-right pr-3 whitespace-nowrap px-2 py-2.5">
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
                      const normCode = rec.course_code.trim().toUpperCase().replace(/\s+/g, "");
                      const todayStatus = todayCourseStatusMap.get(normCode);

                      return (
                        <TableRow key={rec.id || rec.course_code} className="border-border/40 hover:bg-muted/30 transition-colors">
                          {/* 1. Course & Faculty */}
                          <TableCell className={`py-3 px-3 align-middle border-l-3 ${statusColor}`}>
                            <div className="pl-1.5 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-foreground tracking-tight">
                                  {rec.course_code}
                                </span>
                                {rec.slot && /^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/i.test(rec.slot.trim()) && (
                                  <span className="inline-flex items-center text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                                    {rec.slot}
                                  </span>
                                )}
                                {todayStatus && (
                                  <span
                                    className={cn(
                                      "inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border",
                                      todayStatus.status === "Present"
                                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                        : "bg-destructive/15 text-destructive border-destructive/30"
                                    )}
                                    title={`Attendance marked ${todayStatus.status} today (${todayStatus.date})`}
                                  >
                                    {todayStatus.status}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground font-medium line-clamp-1" title={rec.course_name}>
                                {rec.course_name}
                              </div>
                              {rec.faculty_name && 
                                rec.faculty_name.toLowerCase().trim() !== rec.course_name.toLowerCase().trim() && 
                                rec.faculty_name.toLowerCase().trim() !== rec.course_code.toLowerCase().trim() && 
                                !rec.course_name.toLowerCase().includes(rec.faculty_name.toLowerCase().trim()) && (() => {
                                  const directoryUrl = getFacultyDirectoryUrl(rec.faculty_name);
                                  return (
                                    <div className="flex items-center gap-1 pt-0.5">
                                      {directoryUrl ? (
                                        <Link
                                          to={directoryUrl}
                                          className="group/fac inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted px-1.5 py-0.5 rounded border border-border/40 hover:border-primary/40 font-medium transition-all shadow-2xs hover:shadow-xs"
                                          title={`Find ${rec.faculty_name} in Faculty Directory`}
                                        >
                                          <UserCheck className="h-3 w-3 text-primary/70 group-hover/fac:text-primary shrink-0 transition-colors" />
                                          <span className="truncate max-w-[200px]">
                                            {rec.faculty_name}
                                          </span>
                                        </Link>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/90 bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 font-medium">
                                          <UserCheck className="h-3 w-3 text-primary/70 shrink-0" />
                                          <span className="truncate max-w-[200px]" title={rec.faculty_name}>
                                            {rec.faculty_name}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  );
                              })()}
                            </div>
                          </TableCell>

                          {/* 2. Hours */}
                          <TableCell className="py-3 px-2 text-center align-middle text-xs whitespace-nowrap font-mono tabular-nums">
                            <div className="font-bold text-foreground text-xs sm:text-sm tracking-tight">
                              {att}<span className="font-normal text-muted-foreground text-xs font-sans">/{cond} hrs</span>
                            </div>
                            <div className="text-2xs text-muted-foreground mt-0.5">
                              <span className={displayedAbsent > 0 ? "text-destructive/80 font-medium" : "text-muted-foreground"}>
                                {displayedAbsent} absent
                              </span>
                            </div>
                          </TableCell>

                          {/* 3. Percentage */}
                          <TableCell className="py-3 px-2 text-center align-middle whitespace-nowrap">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-xs sm:text-sm font-black tracking-tight ${
                                isDanger ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                              }`}>
                                {pct}%
                              </span>
                              {isSimulated && (
                                <span className="text-[10px] text-muted-foreground">was {rec.attendance_percentage}%</span>
                              )}
                              <div className="w-14 sm:w-16">
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
                          <TableCell className="py-3 px-2 text-center align-middle whitespace-nowrap">
                            {neededForTarget > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md border border-destructive/20">
                                <AlertTriangle className="h-3 w-3" /> Need {neededForTarget} cls
                              </span>
                            ) : safeAllowanceForTarget > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                                <ShieldCheck className="h-3 w-3" /> {safeAllowanceForTarget} safe
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground font-medium bg-muted/40 px-1.5 py-0.5 rounded-md border border-border/40">
                                On target
                              </span>
                            )}
                          </TableCell>

                          {/* 5. Planner / Simulation */}
                          <TableCell className="py-3 px-2 pr-3 text-right align-middle whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => adjustSim(rec.course_code, true)}
                                      className="h-6.5 w-6.5 rounded-md flex items-center justify-center text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20"
                                      aria-label="Simulate attending next class"
                                    >
                                      <Plus className="h-3 w-3" />
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
                                      className="h-6.5 w-6.5 rounded-md flex items-center justify-center text-destructive bg-destructive/10 hover:bg-destructive/20 active:scale-95 transition-all border border-destructive/20"
                                      aria-label="Simulate missing next class"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Simulate +1 Absent</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                {isSimulated ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          onClick={() => adjustSim(rec.course_code, false, true)}
                                          className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all"
                                          aria-label="Reset simulation"
                                        >
                                          <RotateCcw className="h-2.5 w-2.5" />
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

              {/* Mobile Cards (< sm: zero horizontal scroll, direct readability) */}
              <div className="sm:hidden space-y-3">
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
                  const normCode = rec.course_code.trim().toUpperCase().replace(/\s+/g, "");
                  const todayStatus = todayCourseStatusMap.get(normCode);

                  return (
                    <div
                      key={`mobile-${rec.id || rec.course_code}`}
                      className={cn(
                        "rounded-xl border border-border/70 bg-card p-3.5 shadow-xs space-y-2.5 border-l-4",
                        statusColor
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-foreground tracking-tight">
                              {rec.course_code}
                            </span>
                            {rec.slot && /^[A-Z][0-9]?(\+[A-Z][0-9]?)*$/i.test(rec.slot.trim()) && (
                              <span className="inline-flex items-center text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded border border-primary/20">
                                {rec.slot}
                              </span>
                            )}
                            {todayStatus && (
                              <span
                                className={cn(
                                  "inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider border",
                                  todayStatus.status === "Present"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                    : "bg-destructive/15 text-destructive border-destructive/30"
                                )}
                              >
                                {todayStatus.status}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium line-clamp-1" title={rec.course_name}>
                            {rec.course_name}
                          </div>
                          {rec.faculty_name && (
                            <div className="text-[11px] text-muted-foreground truncate max-w-[210px]">
                              {rec.faculty_name}
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className={cn(
                            "text-sm font-black tracking-tight",
                            isDanger ? "text-destructive" : isWarning ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {pct}%
                          </span>
                          {isSimulated && (
                            <span className="text-[10px] text-muted-foreground block">was {rec.attendance_percentage}%</span>
                          )}
                        </div>
                      </div>

                      <Progress
                        value={Math.min(100, pct)}
                        className={cn(
                          "h-1.5 bg-muted",
                          isDanger ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : "[&>div]:bg-emerald-500"
                        )}
                      />

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground font-mono text-xs">{att}/{cond} hrs</span>
                          <span className={cn("text-[10px]", displayedAbsent > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>
                            ({displayedAbsent} abs)
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {neededForTarget > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded border border-destructive/20">
                              <AlertTriangle className="h-2.5 w-2.5" /> Need {neededForTarget}
                            </span>
                          ) : safeAllowanceForTarget > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              <ShieldCheck className="h-2.5 w-2.5" /> {safeAllowanceForTarget} safe
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground font-medium bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                              On target
                            </span>
                          )}

                          <div className="flex items-center gap-1 ml-1">
                            <button
                              type="button"
                              onClick={() => adjustSim(rec.course_code, true)}
                              className="h-6 w-6 rounded flex items-center justify-center text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 transition-all border border-emerald-500/20"
                              aria-label="Simulate +1 Present"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustSim(rec.course_code, false)}
                              className="h-6 w-6 rounded flex items-center justify-center text-destructive bg-destructive/10 hover:bg-destructive/20 active:scale-95 transition-all border border-destructive/20"
                              aria-label="Simulate +1 Absent"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            {isSimulated && (
                              <button
                                type="button"
                                onClick={() => adjustSim(rec.course_code, false, true)}
                                className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground"
                                aria-label="Reset simulation"
                              >
                                <RotateCcw className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        </>
      )}

      {/* Tab 2: Timetable Dashboard */}
      {activePortalTab === "timetable" && (
        <>
          {isTimetableLoading && timetableSlots.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2.5 text-muted-foreground text-sm min-h-[240px]">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading class timetable…</p>
            </div>
          )}

          {!isTimetableLoading && timetableSlots.length === 0 && (
            <div className="border border-dashed border-border/80 rounded-xl py-12 px-6 text-center max-w-md mx-auto space-y-3">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">No timetable records found</h3>
                <p className="text-xs text-muted-foreground">
                  If you recently registered or updated courses on the SRM AP portal, click "Sync" to fetch your weekly schedule.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing || !isOnline}
                className="gap-1.5 text-xs font-medium"
              >
                <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Syncing…" : "Sync Timetable"}</span>
              </Button>
            </div>
          )}

          {timetableSlots.length > 0 && (
            <div className="space-y-6">
              <ActiveScheduleBanner slots={timetableSlots} />

              {activeCourseCode && (
                <div className="flex items-center justify-between bg-primary/10 border border-primary/20 text-primary rounded-xl px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span>Filtering timetable for <strong>{activeCourseCode}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCourseCode(null)}
                    className="font-semibold underline hover:text-foreground transition-colors"
                  >
                    Reset highlight
                  </button>
                </div>
              )}

              <WeeklyMatrixTable
                slots={timetableSlots}
                activeCourseCode={activeCourseCode}
                onSelectCourse={(courseCode) =>
                  setActiveCourseCode((prev) => (prev === courseCode ? null : courseCode))
                }
              />

              <CourseFacultyDirectory
                slots={timetableSlots}
                activeCourseCode={activeCourseCode}
                onSelectCourse={(courseCode) =>
                  setActiveCourseCode((prev) => (prev === courseCode ? null : courseCode))
                }
              />
            </div>
          )}
        </>
      )}

      {/* Tab 3: Fee & Finance Dashboard */}
      {activePortalTab === "finance" && (
        <FeeFinanceOverview
          dues={feeDues}
          paidHistory={feePaidHistory}
          isLoading={isFinanceLoading}
          onRefresh={fetchFinance}
          isSyncing={isSyncing}
        />
      )}

      {/* Re-link Portal Modal */}
      <ImportSrmPortalDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        onSuccess={() => {
          fetchAttendance();
          fetchTimetable();
          fetchFinance();
          fetchDailyAttendance();
        }}
      />

        </div>
      </div>
    </>
  );
}
