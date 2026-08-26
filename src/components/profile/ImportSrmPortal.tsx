import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Eye,
  CheckCircle2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import AcademicDetailsDialog, { AcademicSubject } from "./AcademicDetailsDialog";
import { formatRelativeTime } from "@/utils/date-utils";

export interface AcademicImport {
  program: string | null;
  current_semester: number | null;
  cgpa: number | null;
  subjects: AcademicSubject[];
  sync_status: "pending" | "success" | "failed";
  last_synced_at: string | null;
  register_number?: string | null;
}

interface CaptchaStepData {
  sessionToken: string;
  imageDataUrl: string;
  guess: string | null;
}

interface ImportSuccessResult {
  program: string | null;
  currentSemester: number | null;
  cgpa: number | null;
  subjectCount: number;
  subjects: AcademicSubject[];
}

/**
 * Strips a transcript down to what's safe to show on a public profile:
 * course code + name only, deduped (a retaken course appears once), never
 * grades, credits, semester, or CGPA.
 */
function dedupeCourses(subjects: AcademicSubject[]): Array<{ code: string; name: string }> {
  const seen = new Map<string, string>();
  for (const s of subjects) if (!seen.has(s.code)) seen.set(s.code, s.name);
  return Array.from(seen, ([code, name]) => ({ code, name }));
}

interface ImportSrmPortalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (result?: ImportSuccessResult) => void;
  /** Pre-fills the register number field — used when the caller (e.g. the
   * mentor sign-up form) already has it, e.g. from college_id. */
  defaultRegisterNumber?: string;
}

/**
 * Standalone dialog for linking student.srmap.edu.in — always sends
 * step:"link", so a successful login also persists an encrypted DOB and flips
 * users.date_of_birth_linked, letting sync-srm-portal refresh this account
 * automatically afterward (see that function's header comment). Can be
 * rendered from anywhere (profile page, mentor sign-up form). Fully
 * self-contained: the success step includes its own course list viewer and
 * "Apply to Profile" action, so every entry point behaves the same way.
 */
export const ImportSrmPortalDialog = ({
  open,
  onOpenChange,
  onSuccess,
  defaultRegisterNumber,
}: ImportSrmPortalDialogProps) => {
  const { user, refreshProfile } = useAuth();
  const [captchaData, setCaptchaData] = useState<CaptchaStepData | null>(null);
  const [fetchingCaptcha, setFetchingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [registerNumber, setRegisterNumber] = useState("");
  const [password, setPassword] = useState("");
  const [captchaText, setCaptchaText] = useState("");

  const [successResult, setSuccessResult] = useState<ImportSuccessResult | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [applyingToProfile, setApplyingToProfile] = useState(false);
  const [appliedToProfile, setAppliedToProfile] = useState(false);
  const [coursesOnProfile, setCoursesOnProfile] = useState(false);
  const [togglingCourses, setTogglingCourses] = useState(false);

  const fetchCaptcha = async () => {
    setFetchingCaptcha(true);
    setCaptchaData(null);
    setCaptchaText("");
    try {
      const { data, error } = await supabase.functions.invoke("import-srm-portal", {
        body: { step: "captcha" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const step: CaptchaStepData = data.data;
      setCaptchaData(step);
      if (step.guess) setCaptchaText(step.guess);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Couldn't reach the SRM portal");
      onOpenChange(false);
    } finally {
      setFetchingCaptcha(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSuccessResult(null);
      setRegisterNumber(defaultRegisterNumber ?? "");
      setPassword("");
      setAppliedToProfile(false);
      fetchCaptcha();

      // Prefill the register number from a prior successful sync, if any —
      // it's not sensitive (unlike the portal password, which is never
      // stored in plaintext), so there's no reason to make the student
      // retype it. Only overrides the field if the caller didn't already
      // supply one via defaultRegisterNumber.
      if (user) {
        if (!defaultRegisterNumber) {
          supabase
            .from("academic_imports")
            .select("register_number")
            .eq("user_id", user.id)
            .maybeSingle()
            .then(({ data }) => {
              if (data?.register_number) setRegisterNumber(data.register_number);
            });
        }

        supabase
          .from("mentors")
          .select("courses")
          .eq("id", user.id)
          .maybeSingle()
          .then(({ data }) => {
            setCoursesOnProfile(Array.isArray(data?.courses) && data.courses.length > 0);
          });
      }
    } else {
      setPassword("");
      setCaptchaData(null);
      setSuccessResult(null);
      setDetailsOpen(false);
      setAppliedToProfile(false);
      setCoursesOnProfile(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleToggleCoursesOnProfile = async (next: boolean) => {
    if (!user || !successResult) return;
    setTogglingCourses(true);
    try {
      const courses = next ? dedupeCourses(successResult.subjects) : [];
      const { error } = await supabase.from("mentors").update({ courses }).eq("id", user.id);
      if (error) throw error;
      setCoursesOnProfile(next);
      toast.success(next ? "Courses are now visible on your public profile" : "Courses removed from your public profile");
    } catch (err: unknown) {
      console.error("Error toggling courses on profile:", err);
      toast.error("Failed to update your profile");
    } finally {
      setTogglingCourses(false);
    }
  };

  const handleApplyToProfile = async () => {
    if (!user || !successResult) return;
    setApplyingToProfile(true);
    try {
      const updates: { department?: string } = {};
      if (successResult.program) updates.department = successResult.program;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("users").update(updates).eq("id", user.id);
        if (error) throw error;
      }

      if (successResult.cgpa != null || successResult.program) {
        const mentorUpdates: { cgpa?: number | null; department?: string } = {};
        if (successResult.cgpa != null) mentorUpdates.cgpa = successResult.cgpa;
        if (successResult.program) mentorUpdates.department = successResult.program;
        await supabase.from("mentors").update(mentorUpdates).eq("id", user.id);
      }

      setAppliedToProfile(true);
      toast.success("Profile updated with your imported department & CGPA!");
    } catch (err: unknown) {
      console.error("Error applying imported data to profile:", err);
      toast.error("Failed to update profile values");
    } finally {
      setApplyingToProfile(false);
    }
  };

  const handleSubmit = async () => {
    if (!captchaData || !registerNumber.trim() || !password.trim() || !captchaText.trim()) return;

    setSubmitting(true);
    const loadingId = toast.loading("Signing in and linking your SRM portal...");
    try {
      const { data, error } = await supabase.functions.invoke("import-srm-portal", {
        body: {
          step: "link",
          sessionToken: captchaData.sessionToken,
          registerNumber: registerNumber.trim().toUpperCase(),
          dobPassword: password,
          captcha: captchaText.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const result: ImportSuccessResult = {
        program: data.data?.program ?? null,
        currentSemester: data.data?.currentSemester ?? null,
        cgpa: data.data?.cgpa ?? null,
        subjectCount: data.data?.subjectCount ?? data.data?.subjects?.length ?? 0,
        subjects: data.data?.subjects ?? [],
      };

      setSuccessResult(result);
      void refreshProfile();

      toast.success(
        `Linked SRM Portal: ${result.program || "Coursework"} (${result.subjectCount} subjects${result.cgpa ? ` · ${result.cgpa.toFixed(2)} CGPA` : ""})`,
        {
          id: loadingId,
          description: "We'll keep this current automatically from now on.",
        }
      );

      onSuccess?.(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Linking failed";
      toast.error(message, { id: loadingId });
      fetchCaptcha();
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
        {successResult ? (
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 animate-in zoom-in-95">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-bold">SRM Portal Linked!</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground max-w-xs">
                We signed in to the SRM portal and read your coursework and academic standing below.
                This is already saved to your account, and we'll refresh it automatically going forward.
              </DialogDescription>
            </div>

            {/* Imported Metrics Card */}
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Summary of Imported Data
                </span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-3xs gap-1 font-normal">
                  <ShieldCheck className="h-3 w-3" /> Verified SRM AP
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground text-2xs">Program</p>
                  <p className="font-semibold text-foreground truncate" title={successResult.program || "N/A"}>
                    {successResult.program || "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-2xs">Current Semester</p>
                  <p className="font-semibold text-foreground">
                    {successResult.currentSemester ? `Semester ${successResult.currentSemester}` : "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-2xs">CGPA</p>
                  <p className="font-semibold text-foreground">
                    {successResult.cgpa != null ? `${successResult.cgpa.toFixed(2)} / 10.0` : "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground text-2xs">Coursework</p>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    className="font-semibold text-primary hover:underline text-left"
                  >
                    {successResult.subjectCount} Subjects Loaded
                  </button>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => setDetailsOpen(true)}
              >
                <Eye className="mr-1.5 h-3.5 w-3.5" /> View full course list
              </Button>
            </div>

            {/* Explicit save action — separate from the auto-sync above */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
              <p className="text-2xs text-muted-foreground leading-relaxed">
                Want your <span className="font-medium text-foreground">program and CGPA</span> to also
                show up on your public FriendlyLearning profile (so mentors/search can see it)? Apply it below.
                This step is optional.
              </p>
              <Button
                type="button"
                className="w-full text-xs"
                onClick={handleApplyToProfile}
                disabled={applyingToProfile || appliedToProfile}
              >
                {applyingToProfile ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : appliedToProfile ? (
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                )}
                {appliedToProfile ? "Applied to Profile" : "Apply to Profile"}
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Link your SRM portal
              </DialogTitle>
              <DialogDescription>
                Used to securely link your SRM portal — enables automatic syncing of your
                CGPA, semester and coursework. Stored encrypted, never shown to anyone.
                We'll sign in once now to confirm it works, then keep it current in the
                background from then on.
              </DialogDescription>
            </DialogHeader>

            {fetchingCaptcha && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Fetching a captcha from the portal...
              </div>
            )}

            {!fetchingCaptcha && captchaData && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="srm-register-number">Application / Register Number</Label>
                  <Input
                    id="srm-register-number"
                    placeholder="AP23111260062"
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="srm-password">Date of birth (portal password)</Label>
                  <PasswordInput
                    id="srm-password"
                    placeholder="DDMMYYYY (your date of birth)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="off"
                  />
                  <p className="text-2xs text-muted-foreground">
                    Same password you use to sign in at student.srmap.edu.in — stored encrypted, used only to keep your academic info current.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="srm-captcha">Captcha</Label>
                  <img
                    src={captchaData.imageDataUrl}
                    alt="SRM portal captcha"
                    className="h-10 rounded border border-border bg-secondary px-2"
                  />
                  <Input
                    id="srm-captcha"
                    placeholder="Enter the captcha text"
                    value={captchaText}
                    onChange={(e) => setCaptchaText(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <p className="text-2xs text-muted-foreground">
                  Independent student project — not affiliated with or endorsed by SRM University AP.
                </p>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={submitting || !registerNumber.trim() || !password.trim() || !captchaText.trim()}
                    onClick={handleSubmit}
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>

    {successResult && (
      <AcademicDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        record={{
          program: successResult.program,
          current_semester: successResult.currentSemester,
          cgpa: successResult.cgpa,
          subjects: successResult.subjects,
          sync_status: "success",
          last_synced_at: new Date().toISOString(),
          register_number: registerNumber || null,
        }}
        onApplyToProfile={handleApplyToProfile}
        isApplyingToProfile={applyingToProfile}
        coursesOnProfile={coursesOnProfile}
        onToggleCoursesOnProfile={handleToggleCoursesOnProfile}
        isTogglingCourses={togglingCourses}
      />
    )}
  </>
);
};

interface ImportSrmPortalProps {
  onProfileUpdate?: () => void;
}

/**
 * Card placed on the Profile page (mentors only) that shows the current link
 * status, lets a mentor link their SRM portal for automatic background sync,
 * and offers a human-present "Sync now" as a fallback alongside the
 * automatic refresh (see sync-srm-portal for how that runs).
 */
const ImportSrmPortal = ({ onProfileUpdate }: ImportSrmPortalProps) => {
  const { user, profile } = useAuth();
  const [record, setRecord] = useState<AcademicImport | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [applyingToProfile, setApplyingToProfile] = useState(false);
  const [coursesOnProfile, setCoursesOnProfile] = useState(false);
  const [togglingCourses, setTogglingCourses] = useState(false);

  const isLinked = Boolean(profile?.date_of_birth_linked);

  const loadRecord = async () => {
    if (!user) return;
    setLoadingRecord(true);
    const [{ data }, { data: mentorData }] = await Promise.all([
      supabase
        .from("academic_imports")
        .select("program, current_semester, cgpa, subjects, sync_status, last_synced_at, register_number")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("mentors").select("courses").eq("id", user.id).maybeSingle(),
    ]);

    setRecord((data as unknown as AcademicImport | null) ?? null);
    setCoursesOnProfile(Array.isArray(mentorData?.courses) && mentorData.courses.length > 0);
    setLoadingRecord(false);
  };

  useEffect(() => {
    loadRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleApplyToProfile = async () => {
    if (!user || !record) return;
    setApplyingToProfile(true);

    try {
      const updates: { department?: string } = {};
      if (record.program) {
        updates.department = record.program;
      }

      // Update users table
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("users")
          .update(updates)
          .eq("id", user.id);
        if (error) throw error;
      }

      // Also update mentors table if user is a mentor
      if (record.cgpa != null || record.program) {
        const mentorUpdates: { cgpa?: number | null; department?: string } = {};
        if (record.cgpa != null) mentorUpdates.cgpa = record.cgpa;
        if (record.program) mentorUpdates.department = record.program;

        await supabase
          .from("mentors")
          .update(mentorUpdates)
          .eq("id", user.id);
      }

      toast.success("Profile updated with imported SRM department & CGPA!");
      onProfileUpdate?.();
    } catch (err: unknown) {
      console.error("Error applying imported data to profile:", err);
      toast.error("Failed to update profile values");
    } finally {
      setApplyingToProfile(false);
    }
  };

  const handleToggleCoursesOnProfile = async (next: boolean) => {
    if (!user || !record) return;
    setTogglingCourses(true);
    try {
      const courses = next ? dedupeCourses(record.subjects) : [];
      const { error } = await supabase.from("mentors").update({ courses }).eq("id", user.id);
      if (error) throw error;
      setCoursesOnProfile(next);
      toast.success(next ? "Courses are now visible on your public profile" : "Courses removed from your public profile");
    } catch (err: unknown) {
      console.error("Error toggling courses on profile:", err);
      toast.error("Failed to update your profile");
    } finally {
      setTogglingCourses(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-background p-4 sm:p-5 shadow-sm transition-all">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-primary/15 p-2.5 text-primary shrink-0 border border-primary/20">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm sm:text-base text-foreground">
                  SRM Portal Sync
                </h3>
                {isLinked && record?.sync_status === "success" && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-3xs gap-1 font-normal">
                    <CheckCircle2 className="h-3 w-3" /> Linked
                  </Badge>
                )}
              </div>

              {loadingRecord ? (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Checking academic records...
                </p>
              ) : isLinked && record?.sync_status === "success" ? (
                <div className="space-y-1 mt-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <span className="text-xs font-medium text-foreground">
                      {record.program ?? "Program"}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      Sem {record.current_semester ?? "?"}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {record.subjects?.length ? `${record.subjects.length} subjects` : "0 subjects"}
                    </span>
                    {record.cgpa != null && (
                      <Badge variant="secondary" className="text-3xs gap-1 font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                        <ShieldCheck className="h-3 w-3" /> {record.cgpa.toFixed(2)} CGPA
                      </Badge>
                    )}
                  </div>
                  {record.last_synced_at && (
                    <p className="text-2xs text-muted-foreground">
                      This updates automatically — last refreshed {formatRelativeTime(record.last_synced_at)}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1 max-w-lg">
                  Link your SRM portal once and we'll keep your verified coursework, branch, current
                  semester, and CGPA current automatically from student.srmap.edu.in — no more manual re-imports.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
            {isLinked && record?.sync_status === "success" && (
              <>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setDetailsDialogOpen(true)}
                  className="text-xs gap-1.5 flex-1 sm:flex-initial"
                >
                  <Eye className="h-3.5 w-3.5" /> View Courses
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleApplyToProfile}
                  disabled={applyingToProfile}
                  title="Apply imported department & CGPA to your profile"
                  className="text-xs gap-1.5 flex-1 sm:flex-initial"
                >
                  {applyingToProfile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                  Apply to Profile
                </Button>
              </>
            )}

            <Button
              type="button"
              variant={isLinked && record?.sync_status === "success" ? "secondary" : "default"}
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              title={isLinked ? "This updates automatically, but you can refresh manually here" : undefined}
              className="text-xs gap-1.5 flex-1 sm:flex-initial"
            >
              {isLinked ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5" /> Sync now
                </>
              ) : (
                <>
                  <GraduationCap className="h-3.5 w-3.5" /> Link SRM Portal
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Link/sync dialog */}
      <ImportSrmPortalDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={loadRecord}
      />

      {/* Course Details Inspector Dialog */}
      <AcademicDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        record={record}
        onReSync={() => setImportDialogOpen(true)}
        onApplyToProfile={handleApplyToProfile}
        isApplyingToProfile={applyingToProfile}
        coursesOnProfile={coursesOnProfile}
        onToggleCoursesOnProfile={handleToggleCoursesOnProfile}
        isTogglingCourses={togglingCourses}
      />
    </>
  );
};

export default ImportSrmPortal;
