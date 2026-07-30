import { useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { confirmAlumniStatus } from "@/integrations/supabase/services/alumni";

interface AlumniConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Their expected year, so the field is a confirmation rather than a question. */
  graduationYear: number | null;
  onConfirmed: () => void;
}

/**
 * Confirming graduation, and nothing else.
 *
 * There is deliberately no re-verification here. The College ID does not expire
 * — AP23 proves enrollment in 2027 and still proves it in 2037 — so asking an
 * alumnus to prove themselves again is friction with no security gain. Company
 * and role are optional: they are what students actually want from an alumni
 * mentor, but a blank answer is better than an abandoned form.
 */
const AlumniConfirmModal = ({
  open,
  onOpenChange,
  graduationYear,
  onConfirmed,
}: AlumniConfirmModalProps) => {
  const [year, setYear] = useState<string>(graduationYear ? String(graduationYear) : "");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Wide enough to correct a wrong suggestion in either direction. The year was
  // only ever derived from the enrollment year in their College ID, and this is
  // the moment they finally know it for certain.
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, i) => currentYear - 6 + i);

  const submit = async () => {
    setSaving(true);
    const { error } = await confirmAlumniStatus({
      graduationYear: year ? Number.parseInt(year, 10) : undefined,
      company,
      jobTitle,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message || "Could not save that — please try again");
      return;
    }

    toast.success("You're listed as an alumni mentor");
    onConfirmed();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Confirm you've graduated
          </DialogTitle>
          <DialogDescription>
            You'll stay a mentor — students will just see that you've graduated, which is
            what they look for when asking about placements and careers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="alumni-year">Graduation year</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger id="alumni-year">
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Change this if it's wrong — we guessed it from your College ID.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alumni-company">
              Where you work <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="alumni-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company or university"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alumni-role">
              Your role <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="alumni-role"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Engineer, MS student..."
              maxLength={120}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {/* Not "cancel": they may genuinely not have graduated yet, and the
              prompt is a question, not a task to dismiss. */}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Not yet
          </Button>
          <Button onClick={submit} disabled={saving || !year}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AlumniConfirmModal;
