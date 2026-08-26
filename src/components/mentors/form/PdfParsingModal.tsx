import { useEffect, useState, useMemo } from "react";
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
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
  X,
} from "lucide-react";

export type ParsingStage = "idle" | "reading" | "analyzing" | "synthesizing" | "finalizing" | "success" | "error";

export interface ParsingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PARSING_STEPS: ParsingStep[] = [
  {
    id: "reading",
    title: "Reading Document",
    description: "Extracting raw text streams & document structure",
    icon: FileText,
  },
  {
    id: "identity",
    title: "Academic & Identity Detection",
    description: "Identifying name, department, university & study year",
    icon: GraduationCap,
  },
  {
    id: "skills",
    title: "Skills & Technical Proficiencies",
    description: "Extracting core domain skills, frameworks & tools",
    icon: Zap,
  },
  {
    id: "synthesis",
    title: "Bio & Mentoring Synthesis",
    description: "Synthesizing bio, outcomes & AMA mentoring topics",
    icon: Sparkles,
  },
  {
    id: "finalizing",
    title: "Structuring Profile Data",
    description: "Validating fields & preparing your profile draft",
    icon: CheckCircle2,
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
}: PdfParsingModalProps) {
  // Step index from 0 to 4, or 5 for all completed
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(15);

  // Smooth realistic pacing while processing
  useEffect(() => {
    if (!open) {
      setActiveStepIndex(0);
      setProgressPercent(10);
      return;
    }

    if (stage === "error") {
      return;
    }

    if (stage === "success") {
      setActiveStepIndex(5);
      setProgressPercent(100);
      return;
    }

    // Progression timer to create responsive micro-stages
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
        }, 1500)
      );
    } else if (stage === "synthesizing") {
      setActiveStepIndex(3);
      setProgressPercent(82);
      timers.push(
        setTimeout(() => {
          setActiveStepIndex(4);
          setProgressPercent(94);
        }, 1000)
      );
    } else if (stage === "finalizing") {
      setActiveStepIndex(4);
      setProgressPercent(96);
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [open, stage]);

  const readableFileSize = useMemo(() => formatFileSize(fileSizeBytes), [fileSizeBytes]);

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val && (stage === "success" || stage === "error") && onClose) {
        onClose();
      }
    }}>
      <DialogContent
        className="sm:max-w-md w-[92vw] max-w-lg p-0 overflow-hidden border-primary/20 shadow-2xl rounded-2xl bg-card"
        onPointerDownOutside={(e) => {
          // Prevent accidental dismissal while processing
          if (stage !== "error" && stage !== "success") {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (stage !== "error" && stage !== "success") {
            e.preventDefault();
          }
        }}
      >
        {/* Animated Gradient Accent Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-primary via-indigo-500 to-purple-500 animate-gradient" />

        <div className="p-6 sm:p-7 space-y-6">
          {/* Header */}
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-4 ring-primary/5">
                  <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {stage === "error" ? "Parsing Interrupted" : stage === "success" ? "Profile Extracted!" : "AI Resume Intelligence"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {stage === "error"
                      ? "We couldn't extract all details from this file."
                      : stage === "success"
                      ? "Your skills, headline, and topics are ready!"
                      : "Extracting structured profile data with Gemini AI..."}
                  </DialogDescription>
                </div>
              </div>

              {(stage === "error" || stage === "success") && onClose && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* File Info Pill */}
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 border border-border/60 text-xs">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-foreground truncate max-w-[220px] sm:max-w-[280px]">
                {fileName}
              </span>
              {readableFileSize && (
                <>
                  <span className="text-muted-foreground/60">•</span>
                  <span className="text-muted-foreground text-3xs shrink-0">{readableFileSize}</span>
                </>
              )}
            </div>
          </DialogHeader>

          {/* Progress Bar & Status percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground">
                {stage === "error"
                  ? "Process Stopped"
                  : stage === "success"
                  ? "Extraction Complete"
                  : "Processing Pipeline"}
              </span>
              <span className={stage === "error" ? "text-destructive" : stage === "success" ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-primary"}>
                {stage === "error" ? "Failed" : `${progressPercent}%`}
              </span>
            </div>
            <Progress
              value={progressPercent}
              className={`h-2 transition-all duration-500 ${
                stage === "error" ? "[&>div]:bg-destructive" : stage === "success" ? "[&>div]:bg-emerald-500" : ""
              }`}
            />
          </div>

          {/* Error State Callout */}
          {stage === "error" ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-destructive">Extraction Failed</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {errorMessage || "Unable to read text from this PDF. If it is a scanned image, please upload a digital PDF or export from LinkedIn."}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                {onClose && (
                  <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
                    Cancel
                  </Button>
                )}
                {onRetry && (
                  <Button size="sm" onClick={onRetry} className="h-8 gap-1.5 text-xs font-medium">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Try Another File
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* Step-by-Step Sequential Progress */
            <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-3.5 sm:p-4">
              {PARSING_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isDone = stage === "success" || index < activeStepIndex;
                const isCurrent = stage !== "success" && index === activeStepIndex;
                const isPending = stage !== "success" && index > activeStepIndex;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3.5 rounded-lg p-2 transition-all duration-300 ${
                      isCurrent
                        ? "bg-primary/10 border border-primary/20 shadow-2xs"
                        : isDone
                        ? "opacity-90"
                        : "opacity-40"
                    }`}
                  >
                    {/* Step State Icon */}
                    <div className="shrink-0">
                      {isDone ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs animate-in zoom-in-75">
                          <Check className="h-4 w-4 stroke-[2.5]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-muted-foreground/30 bg-background text-muted-foreground/60">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Step Labels */}
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isCurrent
                              ? "text-primary"
                              : isDone
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {step.title}
                        </p>
                        {isDone && (
                          <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                            Done
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-3xs text-primary font-medium animate-pulse shrink-0">
                            In progress...
                          </span>
                        )}
                      </div>
                      <p className="text-3xs text-muted-foreground truncate">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer note */}
          {stage !== "error" && (
            <div className="text-center">
              <p className="text-3xs text-muted-foreground/80 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                Gemini AI parses your resume in ~3–5 seconds without overwriting manual notes.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
