import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  POST_TYPES,
  createCommunityPost,
  uploadCommunityPostImage,
} from "@/integrations/supabase/services/community-posts";

interface CreatePostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
  /**
   * Set when posting inside a community. Omitted, the post goes to the public
   * board — which is what every existing caller wants and gets by default.
   */
  communityId?: string;
  /** Shown in the header so nobody posts to a group thinking it's the board. */
  communityName?: string;
}

const MAX_TAGS = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** "all" is a filter, not something you can post as. */
const SELECTABLE_TYPES = POST_TYPES.filter((type) => type.value !== "all");

const PLACEHOLDERS: Record<string, { title: string; content: string }> = {
  hackathon: {
    title: "Looking for 2 teammates for Smart India Hackathon",
    content: "What you're building, the skills you need, the deadline, and how to reach you.",
  },
  "study-help": {
    title: "Need help with Data Structures — trees and graphs",
    content: "Which course/topic, what you're stuck on, and when you're free to meet.",
  },
  project: {
    title: "Building a campus food-delivery app — need a backend dev",
    content: "The idea, what's built already, the stack, and the role you're filling.",
  },
  research: {
    title: "Looking for a co-author on an ML paper",
    content: "The research area, current progress, and what you need help with.",
  },
  "problem-solving": {
    title: "Stuck on a DSA problem — segment trees",
    content: "The problem, what you've tried, and where it breaks.",
  },
  announcement: {
    title: "Robotics Club orientation — Friday 5pm, Lab 3",
    content: "What's happening, when, where, and who should come.",
  },
  general: {
    title: "What are you working on this semester?",
    content: "Say what's on your mind.",
  },
};

export const CreatePostModal = ({
  open,
  onOpenChange,
  onPostCreated,
  communityId,
  communityName,
}: CreatePostModalProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const placeholders = PLACEHOLDERS[postType] ?? PLACEHOLDERS.general;

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPostType("");
    setTags([]);
    setTagInput("");
    setImageFile(null);
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    setTags([...tags, tag]);
    setTagInput("");
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setImageFile(file);
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !content.trim() || !postType) {
      toast.error("Add a title, a description and a category");
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        // Reported separately from the post itself. A failed upload used to
        // surface as "Failed to create post", which pointed at the wrong thing
        // entirely: the post had never been attempted, and the actual fault was
        // in storage.
        try {
          const { url } = await uploadCommunityPostImage(imageFile);
          imageUrl = url;
        } catch (uploadError) {
          toast.error(
            uploadError instanceof Error
              ? `Couldn't upload the image: ${uploadError.message}`
              : "Couldn't upload the image. Try posting without it.",
          );
          return;
        }
      }

      const { error } = await createCommunityPost({
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        tags: tags.length > 0 ? tags : undefined,
        image_url: imageUrl,
        community_id: communityId,
      });

      if (error) {
        toast.error(error.message || "Failed to create post");
        return;
      }

      toast.success("Posted! Your post is live on the board.");
      resetForm();
      onPostCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{communityName ? `Post in ${communityName}` : "Create a post"}</DialogTitle>
          <DialogDescription>
            {/* Not "only members will see this" — group posts are readable by
                anyone, exactly like board posts. Membership decides who can
                write, not who can read, and saying otherwise would be a
                privacy promise the database does not make. */}
            {communityName
              ? "This goes in the group's feed rather than the public board. Anyone can read it; only members can post."
              : "Ask for what you need — teammates, study help, collaborators — or share an announcement."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>What kind of post is this?</Label>
            <div className="flex flex-wrap gap-2">
              {SELECTABLE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setPostType(type.value)}
                  aria-pressed={postType === type.value}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    postType === type.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-black/5 hover:bg-black/10 dark:bg-black/40 dark:hover:bg-black/50",
                  )}
                >
                  <span aria-hidden>{type.emoji}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              className="bg-black/5 dark:bg-black/40"
              placeholder={placeholders.title}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={300}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Details</Label>
            <Textarea
              id="content"
              className="bg-black/5 dark:bg-black/40"
              placeholder={placeholders.content}
              rows={6}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              maxLength={5000}
              required
            />
            <p className="text-right text-xs text-muted-foreground">{content.length}/5000</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                className="bg-black/5 dark:bg-black/40"
                placeholder="react, machine-learning, cse-2nd-year"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === ",") {
                    event.preventDefault();
                    addTag();
                  }
                }}
                disabled={tags.length >= MAX_TAGS}
                maxLength={50}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim() || tags.length >= MAX_TAGS}
              >
                Add
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="pr-1">
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((item) => item !== tag))}
                      className="ml-1 hover:text-destructive"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image (optional)</Label>
            <Input
              id="image"
              className="bg-black/5 dark:bg-black/40"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={isSubmitting}
            />
            {imagePreview && (
              <div className="relative mt-2 h-32 w-32">
                <img src={imagePreview} alt="Preview" className="h-full w-full rounded object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-1 top-1 h-6 w-6"
                  onClick={removeImage}
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
