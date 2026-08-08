import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface AcademicImport {
  program: string | null;
  current_semester: number | null;
  cgpa: number | null;
  subjects: { code: string; name: string }[];
  sync_status: "pending" | "success" | "failed";
  last_synced_at: string | null;
}

interface CaptchaStepData {
  sessionToken: string;
  imageDataUrl: string;
  guess: string | null;
}

/**
 * "Import from SRM Portal" — a student's own program/subjects/CGPA, pulled
 * from student.srmap.edu.in instead of typed in by hand. The password field
 * never leaves this component's local state and is cleared the moment the
 * submit call resolves, success or failure — it is never something we store.
 */
const ImportSrmPortal = () => {
  const { user } = useAuth();
  const [record, setRecord] = useState<AcademicImport | null>(null);
  const [loadingRecord, setLoadingRecord] = useState(true);

  const [open, setOpen] = useState(false);
  const [captchaData, setCaptchaData] = useState<CaptchaStepData | null>(null);
  const [fetchingCaptcha, setFetchingCaptcha] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [registerNumber, setRegisterNumber] = useState("");
  const [password, setPassword] = useState("");
  const [captchaText, setCaptchaText] = useState("");

  const loadRecord = async () => {
    if (!user) return;
    setLoadingRecord(true);
    const { data } = await supabase
      .from("academic_imports")
      .select("program, current_semester, cgpa, subjects, sync_status, last_synced_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setRecord((data as AcademicImport | null) ?? null);
    setLoadingRecord(false);
  };

  useEffect(() => {
    loadRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      setOpen(false);
    } finally {
      setFetchingCaptcha(false);
    }
  };

  const openDialog = () => {
    setOpen(true);
    setRegisterNumber("");
    setPassword("");
    fetchCaptcha();
  };

  const handleSubmit = async () => {
    if (!captchaData || !registerNumber.trim() || !password.trim() || !captchaText.trim()) return;

    setSubmitting(true);
    const loadingId = toast.loading("Signing in and importing your academic profile...");
    try {
      const { data, error } = await supabase.functions.invoke("import-srm-portal", {
        body: {
          step: "login",
          sessionToken: captchaData.sessionToken,
          registerNumber: registerNumber.trim().toUpperCase(),
          dobPassword: password,
          captcha: captchaText.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Imported! Your profile now includes real coursework.", { id: loadingId });
      setOpen(false);
      await loadRecord();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Import failed";
      toast.error(message, { id: loadingId });
      // A failed attempt likely burned the captcha/session either way — get a
      // fresh one rather than let the student retry against a stale session.
      fetchCaptcha();
    } finally {
      setPassword("");
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword("");
      setCaptchaData(null);
    }
    setOpen(next);
  };

  return (
    <>
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Import from SRM Portal</p>
              {loadingRecord ? (
                <p className="text-xs text-muted-foreground mt-0.5">Checking your profile...</p>
              ) : record?.sync_status === "success" ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {record.program ?? "Program"} · Semester {record.current_semester ?? "?"}
                    {record.subjects?.length ? ` · ${record.subjects.length} subjects` : ""}
                  </span>
                  {record.cgpa != null && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> {record.cgpa.toFixed(2)} CGPA
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fill in your program, subjects and CGPA automatically from student.srmap.edu.in.
                </p>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant={record?.sync_status === "success" ? "outline" : "default"}
            size="sm"
            onClick={openDialog}
            className="shrink-0"
          >
            {record?.sync_status === "success" ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </>
            ) : (
              <>
                <GraduationCap className="mr-2 h-4 w-4" /> Import
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import your academic profile</DialogTitle>
            <DialogDescription>
              We'll sign in to your SRM student portal once, read your program,
              subjects and CGPA, then fill in your profile. Your portal password
              is never stored — it's used once, in memory, and discarded.
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
                <Label htmlFor="srm-password">Portal Password</Label>
                <Input
                  id="srm-password"
                  type="password"
                  placeholder="DDMMYYYY (your date of birth)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  Same password you use to sign in at student.srmap.edu.in
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

              <p className="text-[11px] text-muted-foreground">
                Independent student project — not affiliated with or endorsed by SRM University AP.
              </p>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenChange(false)}>
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
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportSrmPortal;
