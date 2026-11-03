import { Phone, Video, Monitor, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CallType = "voice" | "video" | null;

interface CallComingSoonModalProps {
  callType: CallType;
  recipientName: string;
  onClose: () => void;
}

const PLANNED = [
  { icon: Video, label: "Voice and video calls" },
  { icon: Monitor, label: "Screen sharing for study sessions" },
  { icon: MessageSquare, label: "Chat alongside the call" },
];

const CallComingSoonModal = ({
  callType,
  recipientName,
  onClose,
}: CallComingSoonModalProps) => {
  const isVideo = callType === "video";
  const Icon = isVideo ? Video : Phone;

  return (
    <Dialog open={callType !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-start text-left">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle>{isVideo ? "Video" : "Voice"} calls are not available yet</DialogTitle>
          <DialogDescription>
            You can't call <span className="font-medium text-foreground">{recipientName}</span> from
            here yet. Calling is planned; until then, use messages.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border">
          <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Planned</p>
          <ul className="divide-y divide-border">
            {PLANNED.map(({ icon: ItemIcon, label }) => (
              <li key={label} className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground">
                <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <Button className="w-full" onClick={onClose}>
          Back to chat
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export { type CallType };
export default CallComingSoonModal;
