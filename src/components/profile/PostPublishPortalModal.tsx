import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, ShieldCheck } from "lucide-react";

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
}: PostPublishPortalModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold">Link your SRM portal</DialogTitle>
            </div>
          </div>
          <DialogDescription className="pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Your profile is live! Link your SRM student portal to automatically sync your verified coursework and earn the Verified Student badge. Takes ~15 seconds.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 text-foreground font-medium text-xs">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Why link your portal?</span>
          </div>
          <ul className="space-y-1 text-2xs sm:text-xs text-muted-foreground pl-1">
            <li>• Auto-imports your course codes (e.g. CSE201, PHY101)</li>
            <li>• Helps juniors find and message you for courses you've taken</li>
            <li>• Your CGPA, marks, and portal password remain completely private</li>
          </ul>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full sm:w-auto text-xs"
            onClick={onViewProfile}
          >
            Skip & view profile
          </Button>
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto gap-1.5 text-xs font-semibold"
            onClick={onLinkPortal}
          >
            <GraduationCap className="h-4 w-4" />
            Link portal now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
