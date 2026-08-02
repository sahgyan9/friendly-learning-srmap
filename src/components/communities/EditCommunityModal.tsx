import { useEffect, useState } from "react";
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
import { GroupIconPicker } from "@/components/communities/GroupIconPicker";
import {
  COMMUNITY_KINDS,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  NAME_MAX,
  NAME_MIN,
  updateCommunity,
  type Community,
} from "@/integrations/supabase/services/communities";

interface EditCommunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  community: Community;
  onSaved: () => void;
}

/**
 * Rename, re-describe, re-kind and re-icon a group you own. Visibility is
 * deliberately absent — flipping public/private after people have already
 * joined has real membership implications and is not what "edit" was asked
 * for here.
 */
export const EditCommunityModal = ({ open, onOpenChange, community, onSaved }: EditCommunityModalProps) => {
  const [name, setName] = useState(community.name);
  const [description, setDescription] = useState(community.description);
  const [kind, setKind] = useState(community.kind);
  const [coverImage, setCoverImage] = useState<string | null>(community.cover_image);
  const [submitting, setSubmitting] = useState(false);

  // The dialog instance is reused across opens; re-sync when a fresh
  // community (or a fresh open) comes in rather than trusting first-mount state.
  useEffect(() => {
    if (open) {
      setName(community.name);
      setDescription(community.description);
      setKind(community.kind);
      setCoverImage(community.cover_image);
    }
  }, [open, community]);

  const descriptionShort = description.trim().length < DESCRIPTION_MIN;
  const nameChanged = name.trim() !== community.name;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (descriptionShort) {
      toast.error(`Describe the group in at least ${DESCRIPTION_MIN} characters`);
      return;
    }

    setSubmitting(true);
    const { error } = await updateCommunity(community.id, { name, description, kind, coverImage });
    setSubmitting(false);

    if (error) {
      toast.error(error.message || "Could not save those changes");
      return;
    }

    toast.success("Group updated");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit group</DialogTitle>
          <DialogDescription>
            {nameChanged
              ? "Renaming changes the group's URL — old links will stop working."
              : "Update how this group appears to everyone."}
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
            <Label htmlFor="community-name-edit">Name</Label>
            <Input
              id="community-name-edit"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={NAME_MIN}
              maxLength={NAME_MAX}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <GroupIconPicker value={coverImage} onChange={setCoverImage} name={name} description={description} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-description-edit">What is it for?</Label>
            <Textarea
              id="community-description-edit"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
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
              {submitting ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCommunityModal;
