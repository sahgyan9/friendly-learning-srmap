import { useState, useRef } from "react";
import { toast } from "sonner";
import { X, ImagePlus } from "lucide-react";

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
  uploadCommunityPostImages,
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
const MAX_IMAGES = 5;
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
  achievement: {
    title: "Won 1st place in National Hackathon 2026!",
    content: "Share your milestone, competition or project wins, key takeaways, and experience.",
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholders = PLACEHOLDERS[postType] ?? PLACEHOLDERS.general;

  const resetForm = () => {
    setTitle("");
    setContent("");
    setPostType("");
    setTags([]);
    setTagInput("");
    setImageFiles([]);
    setImagePreviews((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return [];
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return;
    setTags([...tags, tag]);
    setTagInput("");
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const availableSlots = MAX_IMAGES - imageFiles.length;
    if (availableSlots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per post`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files.slice(0, availableSlots)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name} exceeds 5MB limit`);
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length > 0) {
      setImageFiles((prev) => [...prev, ...validFiles]);
      setImagePreviews((prev) => [...prev, ...newPreviews]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (indexToRemove: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setImagePreviews((prev) => {
      const targetUrl = prev[indexToRemove];
      if (targetUrl) URL.revokeObjectURL(targetUrl);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
    setImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim() || !content.trim() || !postType) {
      toast.error("Add a title, a description and a category");
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedUrls: string[] = [];
      if (imageFiles.length > 0) {
        try {
          uploadedUrls = await uploadCommunityPostImages(imageFiles);
        } catch (uploadError) {
          toast.error(
            uploadError instanceof Error
              ? `Couldn't upload images: ${uploadError.message}`
              : "Couldn't upload images. Try posting without them.",
          );
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await createCommunityPost({
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        tags: tags.length > 0 ? tags : undefined,
        image_urls: uploadedUrls,
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
            {communityName
              ? "This goes in the group's feed rather than the public board. Anyone can read it; only members can post."
              : "Ask for what you need — teammates, study help, collaborators — or share an achievement or announcement."}
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
                  <type.icon className="h-3.5 w-3.5" aria-hidden />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
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
            <div className="flex items-center justify-between">
              <Label htmlFor="images">Images (optional)</Label>
              <span className="text-xs text-muted-foreground">
                {imageFiles.length}/{MAX_IMAGES} images (max 5MB each)
              </span>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={isSubmitting || imageFiles.length >= MAX_IMAGES}
              className="hidden"
            />

            {/* Image previews and add button grid */}
            <div className="flex flex-wrap gap-3 pt-1">
              {imagePreviews.map((previewUrl, idx) => (
                <div
                  key={previewUrl}
                  className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-all"
                >
                  <img
                    src={previewUrl}
                    alt={`Upload preview ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={(e) => removeImage(idx, e)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition-all hover:bg-red-600 focus:outline-none"
                    aria-label={`Remove image ${idx + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium text-white">
                    {idx + 1}
                  </span>
                </div>
              ))}

              {imageFiles.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[11px] font-medium">Add Image</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
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
