import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  GraduationCap,
  Search,
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { formatRelativeTime } from "@/utils/date-utils";

export interface AcademicSubject {
  semester?: number | null;
  code: string;
  name: string;
  credit?: number | null;
}

export interface AcademicImportData {
  program: string | null;
  current_semester: number | null;
  cgpa: number | null;
  subjects: AcademicSubject[];
  sync_status?: "pending" | "success" | "failed";
  last_synced_at?: string | null;
  register_number?: string | null;
}

interface AcademicDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AcademicImportData | null;
  onReSync?: () => void;
  onApplyToProfile?: () => void;
  isApplyingToProfile?: boolean;
}

export const AcademicDetailsDialog = ({
  open,
  onOpenChange,
  record,
  onReSync,
  onApplyToProfile,
  isApplyingToProfile = false,
}: AcademicDetailsDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSemester, setSelectedSemester] = useState<number | "all">("all");

  if (!record) return null;

  const subjects = record.subjects || [];

  // Extract unique semesters
  const semesters = Array.from(
    new Set(
      subjects
        .map((s) => s.semester)
        .filter((sem): sem is number => typeof sem === "number" && sem > 0)
    )
  ).sort((a, b) => a - b);

  // Filtered subjects
  const filteredSubjects = subjects.filter((subject) => {
    const matchesSearch =
      subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subject.code.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSem =
      selectedSemester === "all" || subject.semester === selectedSemester;

    return matchesSearch && matchesSem;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl flex items-center gap-2">
                  SRM Academic Import Details
                  {record.sync_status === "success" && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-normal gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Synced
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Verified coursework & transcript data imported from student.srmap.edu.in
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Card className="bg-background/80 backdrop-blur border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] text-muted-foreground font-medium truncate">Program</p>
                  <p className="text-xs font-semibold text-foreground truncate" title={record.program || "N/A"}>
                    {record.program || "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Semester</p>
                  <p className="text-xs font-semibold text-foreground">
                    {record.current_semester ? `Sem ${record.current_semester}` : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">CGPA</p>
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                    {record.cgpa != null ? record.cgpa.toFixed(2) : "N/A"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur border-border/60 shadow-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium">Courses</p>
                  <p className="text-xs font-semibold text-foreground">
                    {subjects.length} Subjects
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {record.last_synced_at && (
            <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              Last updated: <span className="font-medium text-foreground">{formatRelativeTime(record.last_synced_at)}</span>
              {record.register_number && (
                <span className="text-muted-foreground">· Register No: <code className="bg-secondary px-1 py-0.5 rounded text-[10px] text-foreground">{record.register_number}</code></span>
              )}
            </p>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search course code or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>

          {semesters.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <Button
                variant={selectedSemester === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSemester("all")}
                className="h-7 text-xs px-2.5 rounded-full"
              >
                All Semesters ({subjects.length})
              </Button>
              {semesters.map((sem) => {
                const count = subjects.filter((s) => s.semester === sem).length;
                return (
                  <Button
                    key={sem}
                    variant={selectedSemester === sem ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSemester(sem)}
                    className="h-7 text-xs px-2.5 rounded-full shrink-0"
                  >
                    Sem {sem} ({count})
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* Course List / Table Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[360px]">
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm font-medium">No courses found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery
                  ? `No courses matching "${searchQuery}"`
                  : "No subjects available in this selection"}
              </p>
            </div>
          ) : (
            filteredSubjects.map((subject, idx) => (
              <div
                key={`${subject.code}-${idx}`}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className="font-mono text-[11px] bg-secondary text-secondary-foreground shrink-0">
                    {subject.code}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate" title={subject.name}>
                      {subject.name}
                    </p>
                    {subject.semester && (
                      <p className="text-[10px] text-muted-foreground">
                        Semester {subject.semester}
                      </p>
                    )}
                  </div>
                </div>

                {subject.credit != null && (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {subject.credit} Credits
                  </Badge>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onApplyToProfile && (
              <Button
                variant="default"
                size="sm"
                onClick={onApplyToProfile}
                disabled={isApplyingToProfile}
                className="flex-1 sm:flex-initial text-xs"
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Apply Program & CGPA to Profile
              </Button>
            )}

            {onReSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onReSync();
                }}
                className="flex-1 sm:flex-initial text-xs"
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Re-sync
              </Button>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcademicDetailsDialog;
