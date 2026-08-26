import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  BookOpen,
  Lock,
} from "lucide-react";

interface PostPublishPortalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkPortal: () => void;
  onViewProfile: () => void;
  userName?: string;
}

export default function PostPublishPortalModal({
  open,
  onOpenChange,
  onLinkPortal,
  onViewProfile,
  userName,
}: PostPublishPortalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg w-[92vw] max-w-lg p-0 overflow-hidden border-primary/20 shadow-2xl rounded-2xl bg-card"
        onPointerDownOutside={(e) => {
          // Allow closing by clicking outside
        }}
      >
        {/* Top vibrant gradient banner */}
        <div className="bg-linear-to-r from-emerald-500 via-teal-500 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          {/* Subtle background glow circle */}
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-black/10 blur-lg pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white ring-4 ring-white/10 shadow-lg">
              <Sparkles className="h-6 w-6 text-yellow-200 animate-bounce" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              🎉 Profile Published Live!
            </h2>
            <p className="text-xs sm:text-sm text-white/90 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
              {userName ? `${userName}, your` : "Your"} campus profile is now live on Friendly Learning SRMAP.
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 space-y-6">
          <DialogHeader className="text-left space-y-1.5">
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary shrink-0" />
              Supercharge your profile: Link SRM Portal
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
              Linking takes ~15 seconds and automatically activates powerful student features:
            </DialogDescription>
          </DialogHeader>

          {/* Value cards */}
          <div className="grid gap-2.5 sm:gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-foreground">Verified SRM Student Badge</p>
                <p className="text-muted-foreground leading-snug">
                  Proves authenticity on the campus directory so peers know you are an active student.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-foreground">Auto-Import Course Codes</p>
                <p className="text-muted-foreground leading-snug">
                  Pulls your official subjects (e.g. CSE201, PHY101) directly to your profile.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <Search className="h-4 w-4" />
              </div>
              <div className="text-xs space-y-0.5">
                <p className="font-semibold text-foreground">CampusMind Search Match</p>
                <p className="text-muted-foreground leading-snug">
                  Juniors searching for help in courses you've taken match directly with you.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-3xs text-muted-foreground/80 bg-muted/40 rounded-lg p-2.5 border border-border/40">
            <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>
              <strong>100% Private:</strong> We only import subject names and branch. Your grades, CGPA, and login are never shared or made public.
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onViewProfile}
              className="w-full sm:w-auto text-xs font-medium text-muted-foreground hover:text-foreground order-2 sm:order-1"
            >
              Skip & View Profile
            </Button>
            <Button
              type="button"
              onClick={onLinkPortal}
              className="w-full sm:w-auto gap-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md order-1 sm:order-2"
            >
              <GraduationCap className="h-4 w-4" />
              Link SRM Portal Now
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
