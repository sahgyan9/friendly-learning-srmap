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
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Check,
  RefreshCw,
  X,
  Lightbulb,
  Cpu,
  ArrowRight,
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

const SYNTHESIS_SUB_MESSAGES = [
  "Analyzing technical proficiencies, frameworks & databases...",
  "Distilling project highlights, architecture & key outcomes...",
  "Synthesizing high-impact peer mentoring goals & milestones...",
  "Drafting tailored 'Ask Me Anything' peer discussion topics...",
  "Polishing first-person professional bio summary...",
  "Aligning course terms with SRM AP academic curriculum...",
];

const DID_YOU_KNOW_TIPS = [
  "Mentors with 3+ specific AMA topics receive 4× more student mentorship requests.",
  "Gemini AI automatically structures your projects and course timeline to SRM AP's academic calendar.",
  "You have 100% control to preview, adjust, or discard any drafted field before saving.",
  "Your resume is processed strictly in-memory and is never shared publicly.",
  "Clear skills and outcomes help first-year students find the exact guidance they need.",
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
  const [subMessageIndex, setSubMessageIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
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

  // Rotate dynamic synthesis sub-messages
  useEffect(() => {
    if (!open || stage === "error" || stage === "success") return;

    const interval = setInterval(() => {
      setSubMessageIndex((prev) => (prev + 1) % SYNTHESIS_SUB_MESSAGES.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [open, stage]);

  // Rotate informative Pro-Tips
  useEffect(() => {
    if (!open || stage === "error" || stage === "success") return;

    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % DID_YOU_KNOW_TIPS.length);
    }, 4500);

    return () => clearInterval(interval);
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
        className="sm:max-w-md w-[92vw] max-w-lg p-0 overflow-hidden border-primary/20 shadow-2xl rounded-2xl bg-card transition-all"
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
        {/* Animated Gradient Accent Bar with subtle shimmer */}
        <div className="relative h-1.5 w-full overflow-hidden bg-gradient-to-r from-primary via-indigo-500 to-purple-500">
          {stage !== "error" && stage !== "success" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite]" />
          )}
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Header */}
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-4 ring-primary/5">
                  <Sparkles className="h-5 w-5 animate-pulse text-primary" />
                  {stage !== "error" && stage !== "success" && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                    </span>
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {stage === "error"
                      ? "Parsing Interrupted"
                      : stage === "success"
                      ? "Profile Extracted!"
                      : "AI Resume Intelligence"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    {stage === "error"
                      ? "We couldn't extract all details from this file."
                      : stage === "success"
                      ? "Your skills, headline, projects & bio are ready!"
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

            {/* File Info Pill & Live Telemetry Badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 border border-border/60 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-foreground truncate max-w-[180px] sm:max-w-[230px]">
                  {fileName}
                </span>
                {readableFileSize && (
                  <>
                    <span className="text-muted-foreground/60">•</span>
                    <span className="text-muted-foreground text-3xs shrink-0">{readableFileSize}</span>
                  </>
                )}
              </div>

              {stage !== "error" && stage !== "success" && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-3xs font-semibold shrink-0">
                  <Cpu className="h-3 w-3 animate-spin text-primary" />
                  <span>Gemini AI {elapsedSeconds > 0 ? `(${elapsedSeconds}s)` : "Active"}</span>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Progress Bar & Status percentage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-muted-foreground flex items-center gap-1.5">
                {stage === "error"
                  ? "Process Stopped"
                  : stage === "success"
                  ? "Extraction Complete"
                  : "Processing Pipeline"}
              </span>
              <span
                className={
                  stage === "error"
                    ? "text-destructive"
                    : stage === "success"
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : "text-primary font-bold transition-all duration-300"
                }
              >
                {stage === "error" ? "Failed" : `${progressPercent}%`}
              </span>
            </div>
            <div className="relative">
              <Progress
                value={progressPercent}
                className={`h-2 transition-all duration-500 rounded-full ${
                  stage === "error"
                    ? "[&>div]:bg-destructive"
                    : stage === "success"
                    ? "[&>div]:bg-emerald-500"
                    : "[&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-indigo-500"
                }`}
              />
            </div>
          </div>

          {/* Error State Callout */}
          {stage === "error" ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-destructive">Extraction Incomplete</p>
                  <p className="text-muted-foreground leading-relaxed">
                    {errorMessage ||
                      "Unable to extract text from this document. If it is a scanned image or protected PDF, please upload a digital PDF, export from LinkedIn, or try a Word (.docx) document."}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                {onClose && (
                  <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
                    Dismiss
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
            <div className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3 sm:p-3.5">
              {PARSING_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isDone = stage === "success" || index < activeStepIndex;
                const isCurrent = stage !== "success" && index === activeStepIndex;
                const isPending = stage !== "success" && index > activeStepIndex;

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-all duration-300 ${
                      isCurrent
                        ? "bg-primary/10 border border-primary/30 shadow-xs ring-1 ring-primary/20 scale-[1.01]"
                        : isDone
                        ? "opacity-90"
                        : "opacity-40"
                    }`}
                  >
                    {/* Step State Icon */}
                    <div className="shrink-0">
                      {isDone ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xs animate-in zoom-in-75">
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/30 bg-background text-muted-foreground/60">
                          <Icon className="h-3 w-3" />
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
                          <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                            Done
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-3xs text-primary font-bold animate-pulse shrink-0">
                            In progress...
                          </span>
                        )}
                      </div>

                      {/* Live Dynamic Micro-Status Message on Active Step */}
                      <p className="text-3xs text-muted-foreground truncate">
                        {isCurrent && index === 3
                          ? SYNTHESIS_SUB_MESSAGES[subMessageIndex]
                          : step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Did You Know? / Pro-Tips Carousel to keep users engaged */}
          {stage !== "error" && stage !== "success" && (
            <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent p-3 text-left space-y-1.5 transition-all">
              <div className="flex items-center gap-1.5 text-3xs font-bold text-primary uppercase tracking-wider">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>Did you know?</span>
              </div>
              <p className="text-xs text-foreground/80 leading-snug animate-in fade-in duration-300 key={tipIndex}">
                {DID_YOU_KNOW_TIPS[tipIndex]}
              </p>
            </div>
          )}

          {/* Footer note & background persistence reassurance */}
          {stage !== "error" && (
            <div className="text-center space-y-1 pt-0.5">
              <p className="text-3xs text-muted-foreground/80 flex items-center justify-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block shrink-0" />
                <span>Parses in background • Safe to browse other pages without losing data</span>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
