import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Lock } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  COMMUNITY_KINDS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  NAME_MAX,
  NAME_MIN,
  createCommunity,
  type CommunityVisibility,
} from "@/integrations/supabase/services/communities";

interface CreateCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLACEHOLDERS: Record<string, { name: string; description: string }> = {
  hackathon: {
    name: "SIH 2026 — Team Alpha",
    description: "What you're building, which skills the team still needs, and when you meet.",
  },
  project: {
    name: "Campus food delivery app",
    description: "The idea, what's built so far, the stack, and who you're looking for.",
  },
  club: {
    name: "Robotics Club",
    description: "What the club does, who can join, and when you meet.",
  },
  study: {
    name: "DSA prep — placements 2027",
    description: "What you're revising, how often you meet, and what a member is expected to do.",
  },
  research: {
    name: "ML reading group",
    description: "The area, what you read, and what someone joining should already know.",
  },
  general: {
    name: "Give the group a clear name",
    description: "Say what this group is for and who should join. People decide from this alone.",
  },
};

/**
 * Open to anyone signed in. It used to be a mentor privilege, on the theory that
 * mentors were likeliest to actually run a group — which also meant a first-year
 * looking for a hackathon team, the exact person this is for, had to apply to be
 * a mentor first.
 *
 * The only remaining limit is a cap of ten live groups per person, enforced by
 * the insert policy and surfaced by createCommunity as a sentence rather than a
 * policy violation.
 */
export const CreateCommunityModal = ({ open, onOpenChange }: CreateCommunityModalProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("");
  const [visibility, setVisibility] = useState<CommunityVisibility>("public");
  const [submitting, setSubmitting] = useState(false);

  const placeholders = PLACEHOLDERS[kind] ?? PLACEHOLDERS.general;
  const descriptionShort = description.trim().length < DESCRIPTION_MIN;

  const reset = () => {
    setName("");
    setDescription("");
    setKind("");
    setVisibility("public");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!kind) {
      toast.error("Pick what kind of group this is");
      return;
    }

    setSubmitting(true);
    const { data, error } = await createCommunity({ name, description, kind, visibility });
    setSubmitting(false);

    if (error || !data) {
      toast.error(error?.message ?? "Could not create the group");
      return;
    }

    toast.success("Group created", {
      description:
        visibility === "private"
          ? "You're the owner. It's listed for everyone, but people have to ask you to join."
          : "You're the owner. Share the link and students can join themselves.",
    });
    reset();
    onOpenChange(false);
    navigate(`/communities/${data.slug}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start a group</DialogTitle>
          <DialogDescription>
            A space for a team, a club or a study circle. Anyone can join and read it; only members
            can post.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>What kind of group is this?</Label>
            <div className="flex flex-wrap gap-2">
              {COMMUNITY_KINDS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setKind(option.value)}
                  aria-pressed={kind === option.value}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    kind === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-muted",
                  )}
                >
                  <span aria-hidden>{option.emoji}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-name">Name</Label>
            <Input
              id="community-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={placeholders.name}
              minLength={NAME_MIN}
              maxLength={NAME_MAX}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-description">What is it for?</Label>
            <Textarea
              id="community-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={placeholders.description}
              rows={5}
              maxLength={DESCRIPTION_MAX}
              required
            />
            <p
              className={cn(
                "text-right text-xs",
                descriptionShort && description.length > 0
                  ? "text-destructive"
                  : "text-muted-foreground",
              )}
            >
              {descriptionShort
                ? `${DESCRIPTION_MIN - description.trim().length} more characters — people decide whether to join from this`
                : `${description.length}/${DESCRIPTION_MAX}`}
            </p>
          </div>

          {/* Two cards rather than a checkbox: "private" means something
              specific here — still listed, but joining goes through you — and
              a lone tickbox would leave people guessing which half it meant. */}
          <div className="space-y-2">
            <Label>Who can join?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  {
                    value: "public",
                    icon: Globe,
                    title: "Open",
                    blurb: "Anyone signed in can join and read the posts.",
                  },
                  {
                    value: "private",
                    icon: Lock,
                    title: "Invite only",
                    blurb:
                      "Your group still shows in the directory, but people have to ask to join and only members can read the posts.",
                  },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const selected = visibility === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setVisibility(option.value)}
                    aria-pressed={selected}
                    className={cn(
                      "rounded-lg border p-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {option.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{option.blurb}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create group"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCommunityModal;
