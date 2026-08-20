import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestToJoinCommunity } from "@/integrations/supabase/services/communities";
import { cn } from "@/lib/utils";

const MESSAGE_MAX = 300;

interface JoinRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  communityName: string;
  ownerName: string;
  onRequested: () => void;
}

/**
 * Asks the owner of a private group for a place in it.
 *
 * The message is optional but prompted for, because the owner is deciding about
 * a name they may not recognise, and "I'm in your DSA tutorial" is the
 * difference between an approval and a request that sits there for a week.
 */
const JoinRequestDialog = ({
  open,
  onOpenChange,
  communityId,
  communityName,
  ownerName,
  onRequested,
}: JoinRequestDialogProps) => {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setSending(true);
    const { error } = await requestToJoinCommunity(communityId, message);
    setSending(false);

    if (error) {
      // These come back as written sentences — "You already have a request
      // waiting on this group" tells someone far more than a generic failure.
      toast.error(error.message || "Could not send your request");
      return;
    }

    setMessage("");
    onOpenChange(false);
    onRequested();
    toast.success("Request sent", {
      description: `${ownerName} will get a notification.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ask to join {communityName}</DialogTitle>
          <DialogDescription>
            {ownerName} runs this group and will see your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="join-message">Add a note (optional)</Label>
          <Textarea
            id="join-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={MESSAGE_MAX}
            rows={4}
            placeholder="Say who you are and why you'd like to join — it makes a yes much more likely."
          />
          <p
            className={cn(
              "text-right text-xs",
              message.length >= MESSAGE_MAX ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default JoinRequestDialog;
