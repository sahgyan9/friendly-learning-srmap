
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, ImagePlus } from "lucide-react";
import {
  POST_STATUSES,
  POST_TYPES as ALL_POST_TYPES,
  updateCommunityPost,
  uploadCommunityPostImages,
  getPostImageUrls,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";
import { toast } from "sonner";

const MAX_IMAGES = 5;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// "all" is a feed filter, not a category a post can have.
const POST_TYPES = ALL_POST_TYPES.filter((type) => type.value !== "all");

interface EditPostModalProps {
  post: CommunityPost;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: (updatedPost: CommunityPost) => void;
}

export const EditPostModal = ({ post, open, onOpenChange, onPostUpdated }: EditPostModalProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("");
  const [status, setStatus] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post && open) {
      setTitle(post.title);
      setContent(post.content);
      setPostType(post.post_type);
      setStatus(post.status);
      setTags(post.tags || []);
      setExistingImages(getPostImageUrls(post.image_url));
      setNewImageFiles([]);
      setNewImagePreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [post, open]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim()) && tags.length < 5) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const totalImagesCount = existingImages.length + newImageFiles.length;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const availableSlots = MAX_IMAGES - totalImagesCount;
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
      setNewImageFiles((prev) => [...prev, ...validFiles]);
      setNewImagePreviews((prev) => [...prev, ...newPreviews]);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeExistingImage = (urlToRemove: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExistingImages((prev) => prev.filter((u) => u !== urlToRemove));
  };

  const removeNewImage = (indexToRemove: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setNewImagePreviews((prev) => {
      const url = prev[indexToRemove];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
    setNewImageFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim() || !postType || !status) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedUrls: string[] = [];
      if (newImageFiles.length > 0) {
        uploadedUrls = await uploadCommunityPostImages(newImageFiles);
      }

      const finalImageUrls = [...existingImages, ...uploadedUrls];

      const { data, error } = await updateCommunityPost(post.id, {
        title: title.trim(),
        content: content.trim(),
        post_type: postType,
        status: status,
        tags: tags.length > 0 ? tags : undefined,
        image_urls: finalImageUrls,
      });

      if (error) {
        toast.error("Failed to update post");
        console.error(error);
      } else if (data) {
        toast.success("Post updated successfully!");
        onPostUpdated(data);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="What do you need help with?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="post-type">Post Type *</Label>
              <Select value={postType} onValueChange={setPostType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select post type" />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={status} onValueChange={setStatus} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {POST_STATUSES.map((statusOption) => (
                    <SelectItem key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Description *</Label>
            <Textarea
              id="content"
              placeholder="Describe what you're looking for, your requirements, timeline, etc."
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add relevant tags (max 5)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={tags.length >= 5}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTag}
                disabled={!tagInput.trim() || tags.length >= 5}
              >
                Add
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Images Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-images">Images</Label>
              <span className="text-xs text-muted-foreground">
                {totalImagesCount}/{MAX_IMAGES} images (max 5MB each)
              </span>
            </div>

            <input
              ref={fileInputRef}
              id="edit-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              disabled={isSubmitting || totalImagesCount >= MAX_IMAGES}
              className="hidden"
            />

            <div className="flex flex-wrap gap-3 pt-1">
              {/* Existing saved images */}
              {existingImages.map((imgUrl, idx) => (
                <div
                  key={imgUrl}
                  className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted shadow-sm transition-all"
                >
                  <img
                    src={imgUrl}
                    alt={`Existing image ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={(e) => removeExistingImage(imgUrl, e)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition-all hover:bg-red-600 focus:outline-none"
                    aria-label={`Remove existing image ${idx + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Newly attached image previews */}
              {newImagePreviews.map((previewUrl, idx) => (
                <div
                  key={previewUrl}
                  className="group relative h-24 w-24 overflow-hidden rounded-lg border border-primary/40 bg-muted shadow-sm transition-all"
                >
                  <img
                    src={previewUrl}
                    alt={`New upload ${idx + 1}`}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={(e) => removeNewImage(idx, e)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white shadow-md transition-all hover:bg-red-600 focus:outline-none"
                    aria-label={`Remove new image ${idx + 1}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {totalImagesCount < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-muted/30 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-2xs font-medium">Add Image</span>
                </button>
              )}
            </div>
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
              {isSubmitting ? "Updating..." : "Update Post"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
