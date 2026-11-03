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
          <DialogTitle className="text-lg font-semibold tracking-tight">Your profile is published</DialogTitle>
          <DialogDescription className="pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Link your SRM student portal to add your coursework automatically and get the Verified Student badge. It takes about 15 seconds.
          </DialogDescription>
        </DialogHeader>

        <ul className="list-disc space-y-1.5 rounded-lg border border-border p-3 pl-7 text-sm text-muted-foreground marker:text-muted-foreground/60">
          <li>Imports your course codes, such as CSE201 or PHY101</li>
          <li>Lets juniors find you for courses you have taken</li>
          <li className="flex items-start gap-1.5">
            Your CGPA, marks and portal password stay private
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          </li>
        </ul>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={onViewProfile}
          >
            Skip and view profile
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={onLinkPortal}
          >
            <GraduationCap />
            Link portal
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
