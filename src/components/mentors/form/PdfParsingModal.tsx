import { useEffect, useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  FileText,
  GraduationCap,
  Wrench,
  PenLine,
  ListChecks,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
  X,
} from "lucide-react";

export type ParsingStage =
  | "idle"
  | "reading"
  | "analyzing"
  | "synthesizing"
  | "finalizing"
  | "success"
  | "error";

export interface ParsingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PARSING_STEPS: ParsingStep[] = [
  {
    id: "reading",
    title: "Reading the file",
    description: "Extracting text and layout",
    icon: FileText,
  },
  {
    id: "identity",
    title: "Finding your details",
    description: "Name, department, university and year",
    icon: GraduationCap,
  },
  {
    id: "skills",
    title: "Listing skills",
    description: "Languages, frameworks and tools",
    icon: Wrench,
  },
  {
    id: "synthesis",
    title: "Drafting your profile text",
    description: "Bio, outcomes and topics to ask you about",
    icon: PenLine,
  },
  {
    id: "finalizing",
    title: "Checking fields",
    description: "Validating the draft before you review it",
    icon: ListChecks,
  },
];

interface PdfParsingModalProps {
  open: boolean;
  fileName?: string;
  fileSizeBytes?: number;
  stage: ParsingStage;
  errorMessage?: string;
  onRetry?: () => void;
  onClose?: () => void;
  onMinimize?: () => void;
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PdfParsingModal({
  open,
  fileName = "Resume.pdf",
  fileSizeBytes,
  stage,
  errorMessage,
  onRetry,
  onClose,
  onMinimize,
}: PdfParsingModalProps) {
  // Step index from 0 to 4, or 5 for all completed
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(15);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Interval timers
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed timer tracking
  useEffect(() => {
    if (!open || stage === "error" || stage === "success") {
      setElapsedSeconds(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [open, stage]);

  // Smooth realistic pacing & continuous heartbeat while waiting for backend
  useEffect(() => {
    if (!open) {
      setActiveStepIndex(0);
      setProgressPercent(10);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    if (stage === "error") {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    if (stage === "success") {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setActiveStepIndex(5);
      setProgressPercent(100);
      return;
    }

    const timers: NodeJS.Timeout[] = [];

    if (stage === "reading") {
      setActiveStepIndex(0);
      setProgressPercent(20);
      timers.push(
        setTimeout(() => {
          setActiveStepIndex(1);
          setProgressPercent(38);
        }, 1200)
      );
    } else if (stage === "analyzing") {
      setActiveStepIndex((prev) => Math.max(prev, 2));
      setProgressPercent((prev) => Math.max(prev, 55));
      timers.push(
        setTimeout(() => {
          setActiveStepIndex(3);
          setProgressPercent(76);

          // Asymptotically creep forward during the AI synthesis phase so it never freezes
          if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = setInterval(() => {
            setProgressPercent((prev) => {
              if (prev >= 95) return 95;
              // Smooth non-linear increments: 76 -> 79 -> 82 -> 85 -> 88 -> 90 -> 92 -> 94 -> 95
              const remaining = 96 - prev;
              const step = Math.max(0.8, remaining * 0.15);
              return Math.min(95, Number((prev + step).toFixed(0)));
            });
          }, 900);
        }, 1400)
      );
    } else if (stage === "synthesizing") {
      setActiveStepIndex(3);
      setProgressPercent((prev) => Math.max(prev, 82));
      timers.push(
        setTimeout(() => {
          setActiveStepIndex(4);
          setProgressPercent(94);
        }, 1000)
      );
    } else if (stage === "finalizing") {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setActiveStepIndex(4);
      setProgressPercent(97);
    }

    return () => {
      timers.forEach(clearTimeout);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [open, stage]);

  const readableFileSize = useMemo(() => formatFileSize(fileSizeBytes), [fileSizeBytes]);

  const working = stage !== "error" && stage !== "success";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && (stage === "success" || stage === "error") && onClose) {
          onClose();
        }
      }}
    >
      <DialogContent
        className="w-[92vw] max-w-lg gap-0 p-0 sm:max-w-md"
        onPointerDownOutside={(e) => {
          // Prevent accidental dismissal while processing
          if (working) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (working) {
            e.preventDefault();
          }
        }}
      >
        <div className="space-y-5 p-5 sm:p-6">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                  {stage === "error"
                    ? "Could not read this file"
                    : stage === "success"
                    ? "Profile draft ready"
                    : "Reading your resume"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  {stage === "error"
                    ? "Some details could not be extracted."
                    : stage === "success"
                    ? "Review the drafted skills, headline, projects and bio before saving."
                    : "This usually takes 10 to 30 seconds."}
                </DialogDescription>
              </div>

              {!working && onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="-mr-2 -mt-2 text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                  aria-label="Close"
                >
                  <X />
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium text-foreground">{fileName}</span>
              {readableFileSize && (
                <span className="shrink-0 text-xs text-muted-foreground tabular">{readableFileSize}</span>
              )}
            </div>
            {working && elapsedSeconds > 0 && (
              <span className="shrink-0 text-xs text-muted-foreground tabular">{elapsedSeconds}s</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {stage === "error" ? "Stopped" : stage === "success" ? "Done" : "Progress"}
              </span>
              <span
                className={`font-medium tabular ${
                  stage === "error"
                    ? "text-destructive"
                    : stage === "success"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-foreground"
                }`}
              >
                {stage === "error" ? "Failed" : `${progressPercent}%`}
              </span>
            </div>
            <Progress
              value={progressPercent}
              aria-label="Resume parsing progress"
              className={`h-1.5 ${
                stage === "error"
                  ? "[&>div]:bg-destructive"
                  : stage === "success"
                  ? "[&>div]:bg-emerald-500"
                  : ""
              }`}
            />
          </div>

          {stage === "error" ? (
            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4" role="alert">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-sm leading-relaxed text-foreground">
                  {errorMessage ||
                    "No text could be extracted. If this is a scanned image or a protected PDF, upload a digital PDF, a LinkedIn export, or a Word (.docx) file."}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                {onClose && (
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Dismiss
                  </Button>
                )}
                {onRetry && (
                  <Button size="sm" onClick={onRetry}>
                    <RefreshCw />
                    Try another file
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <ol className="space-y-1">
              {PARSING_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isDone = stage === "success" || index < activeStepIndex;
                const isCurrent = stage !== "success" && index === activeStepIndex;

                return (
                  <li
                    key={step.id}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-150 ${
                      isCurrent ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {isDone ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : isCurrent ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground/60" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${
                          isCurrent ? "font-medium text-foreground" : isDone ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                      {isCurrent && (
                        <p className="truncate text-xs text-muted-foreground">{step.description}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {working && (
            <p className="text-xs text-muted-foreground">
              You can leave this page while it runs. The file is processed in memory and is not shown publicly.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
