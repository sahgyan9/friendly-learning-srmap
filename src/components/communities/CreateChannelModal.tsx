import { useState } from "react";
import { Hash, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CHANNEL_NAME_MAX,
  CHANNEL_TOPIC_MAX,
  MAX_CHANNELS,
  createCommunityChannel,
  previewChannelSlug,
} from "@/integrations/supabase/services/community-channels";

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  /** Channels the group already has, to show how much room is left. */
  channelCount: number;
  onCreated: (slug: string) => void;
}

/**
 * Owner-only, and deliberately a little discouraging.
 *
 * Channels were built here once before and removed, because three fixed rooms
 * split a handful of messages and two of them always looked abandoned. The way
 * that happens again is a person making six rooms on the first afternoon, so
 * this says out loud what a channel costs — the group's conversation gets split
 * — and shows how many are left rather than hiding the cap until it is hit.
 *
 * The suggestions are names that survive contact with a real group, not a
 * catalogue. Picking one fills the box; it does not submit.
 */
const SUGGESTIONS = ["resources", "announcements", "help", "random", "meetups"];

export const CreateChannelModal = ({
  open,
  onOpenChange,
  communityId,
  channelCount,
  onCreated,
}: CreateChannelModalProps) => {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slug = previewChannelSlug(name);
  const remaining = MAX_CHANNELS - channelCount;

  const reset = () => {
    setName("");
    setTopic("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!slug) {
      toast.error("Give the channel a name using letters or numbers");
      return;
    }

    setSubmitting(true);
    const { error } = await createCommunityChannel(communityId, name, topic);
    setSubmitting(false);

    if (error) {
      // The database raises these as sentences meant to be read — "#general is
      // already part of every group" — so they are shown rather than replaced
      // with a generic failure.
      toast.error(error.message || "Could not add that channel");
      return;
    }

    toast.success(`#${slug} is ready`, {
      description: "Everyone in the group can see it and post in it.",
    });
    reset();
    onOpenChange(false);
    onCreated(slug);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a channel</DialogTitle>
          <DialogDescription>
            A separate room inside this group, with its own conversation. Worth adding when one
            topic keeps interrupting another — not before.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="channel-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="resources"
                maxLength={CHANNEL_NAME_MAX}
                autoFocus
                required
                className="pl-9"
              />
            </div>

            {/* Spaces and punctuation become hyphens server-side. Showing the
                result now means nobody discovers their channel is called
                something else only after it exists. */}
            <p className="min-h-[1.25rem] text-xs text-muted-foreground">
              {slug ? (
                <>
                  Members will see it as{" "}
                  <span className="font-mono font-semibold text-foreground">#{slug}</span>
                </>
              ) : (
                "Letters and numbers. Spaces become hyphens."
              )}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
                  className="rounded-full border border-dashed px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                >
                  #{suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-topic">
              What's it for <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="channel-topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Links, notes and slides worth keeping"
              maxLength={CHANNEL_TOPIC_MAX}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-xs text-muted-foreground">
              {remaining > 0
                ? `${remaining} of ${MAX_CHANNELS} left`
                : "This group is at its channel limit"}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !slug || remaining <= 0}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add channel
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateChannelModal;
