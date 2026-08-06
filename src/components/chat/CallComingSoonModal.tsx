
import { Phone, Video, Clock, X, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CallType = "voice" | "video" | null;

interface CallComingSoonModalProps {
  callType: CallType;
  recipientName: string;
  onClose: () => void;
}

const CallComingSoonModal = ({
  callType,
  recipientName,
  onClose,
}: CallComingSoonModalProps) => {
  const isVideo = callType === "video";

  return (
    <Dialog open={callType !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm overflow-hidden border border-white/10 bg-card/90 p-0 shadow-2xl shadow-black/40 backdrop-blur-xl">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-primary/6 blur-2xl" />

        <div className="relative flex flex-col items-center px-6 pb-7 pt-8 text-center">
          {/* Icon */}
          <div className={cn(
            "mb-5 flex h-16 w-16 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-primary/20 to-primary/8 ring-1 ring-primary/25",
            "shadow-lg shadow-primary/15",
          )}>
            {isVideo ? (
              <Video className="h-7 w-7 text-primary" />
            ) : (
              <Phone className="h-7 w-7 text-primary" />
            )}
          </div>

          {/* Badge */}
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-amber-400">
            <Clock className="h-3 w-3" />
            Coming Soon
          </div>

          <DialogHeader className="space-y-0">
            <DialogTitle className="text-lg font-bold">
              {isVideo ? "Video" : "Voice"} Calls
            </DialogTitle>
          </DialogHeader>

          <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
            {isVideo ? "Video" : "Voice"} calling with{" "}
            <span className="font-medium text-foreground">{recipientName}</span> is on the
            roadmap! We're building a real-time WebRTC calling experience for the platform.
          </p>

          {/* Feature list */}
          <ul className="mt-5 w-full space-y-2.5 text-left">
            {[
              "HD voice & video calling",
              "Screen sharing for study sessions",
              "In-call chat & reactions",
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Sparkles className="h-3 w-3 text-primary" />
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <Button
            className="mt-6 w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-md shadow-primary/25 hover:shadow-primary/40"
            onClick={onClose}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { type CallType };
export default CallComingSoonModal;
