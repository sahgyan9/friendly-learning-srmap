import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { titleToSlug as slugify } from "@/integrations/supabase/services/knowledge-sync";
import { useAuth } from "@/context/AuthContext";
import { getInitials } from "@/utils/user-utils";
import { cn } from "@/lib/utils";
import { coverImageOf } from "./article-prose";

export const POPULAR_TAGS = [
  "Hackathons",
  "Tech & Dev",
  "Campus Life",
  "Placements",
  "Academics",
  "Research",
  "Projects",
  "SRM AP",
  "First Year",
  "Guides",
  "Events",
];

interface BlogSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  slug: string;
  onSlugChange: (slug: string) => void;
  excerpt: string;
  onExcerptChange: (excerpt: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  coverUrl: string | null;
  autoExcerpt: string;
}

export function BlogSettingsSheet({
  open,
  onOpenChange,
  title,
  slug,
  onSlugChange,
  excerpt,
  onExcerptChange,
  tags,
  onTagsChange,
  coverUrl,
  autoExcerpt,
}: BlogSettingsSheetProps) {
  const { user, profile } = useAuth();
  const [tagInput, setTagInput] = useState("");

  const handleAddTag = (newTag: string) => {
    const clean = newTag.trim().toLowerCase();
    if (!clean) return;
    if (!tags.some((t) => t.toLowerCase() === clean)) {
      onTagsChange([...tags, clean]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  const togglePresetTag = (tag: string) => {
    const clean = tag.toLowerCase();
    if (tags.some((t) => t.toLowerCase() === clean)) {
      handleRemoveTag(clean);
    } else {
      onTagsChange([...tags, clean]);
    }
  };

  const coverImage = coverImageOf(coverUrl);
  const displayExcerpt = excerpt.trim() || autoExcerpt.trim();
  const displayTitle = title.trim() || "Untitled";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="text-lg font-semibold">Post settings</SheetTitle>
          <SheetDescription>
            URL, summary and tags. Each has a default, so change only what you need.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-8 px-6 py-6">
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="post-slug" className="text-sm font-medium">
                URL
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs text-muted-foreground"
                onClick={() => onSlugChange(slugify(title))}
              >
                Reset from title
              </Button>
            </div>
            <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
              <span className="shrink-0 select-none font-mono text-xs text-muted-foreground">/blogs/</span>
              <Input
                id="post-slug"
                value={slug}
                onChange={(e) => onSlugChange(slugify(e.target.value))}
                placeholder="what-i-learned-building-my-first-app"
                className="h-8 min-w-0 border-0 bg-transparent p-0 pl-0.5 font-mono text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            <p className="text-xs text-muted-foreground">Lowercase letters, numbers and hyphens. Set from the title until you edit it.</p>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="post-excerpt" className="text-sm font-medium">
                Summary
              </Label>
              {excerpt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => onExcerptChange("")}
                >
                  Use first paragraph
                </Button>
              )}
            </div>
            <Textarea
              id="post-excerpt"
              value={excerpt}
              onChange={(e) => onExcerptChange(e.target.value)}
              placeholder={autoExcerpt || "One or two sentences shown on post cards and in search results"}
              className="min-h-[88px] resize-none text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {excerpt.trim()
                ? "Also shown as the subtitle under your title."
                : "Empty, so the first lines of your post are used."}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <Label htmlFor="post-tag-input" className="text-sm font-medium">
              Tags
            </Label>

            {tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Selected tags">
                {tags.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-secondary py-1 pl-2.5 pr-1 text-xs font-medium text-secondary-foreground"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors duration-150 hover:bg-background hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex gap-2">
              <Input
                id="post-tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Type a tag and press Enter"
                className="h-10 min-w-0 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0"
                disabled={!tagInput.trim()}
                onClick={() => handleAddTag(tagInput)}
              >
                Add
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Common topics</p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TAGS.map((pt) => {
                  const active = tags.some((t) => t.toLowerCase() === pt.toLowerCase());
                  const Icon = active ? Check : Plus;
                  return (
                    <button
                      key={pt}
                      type="button"
                      aria-pressed={active}
                      onClick={() => togglePresetTag(pt)}
                      className={cn(
                        "inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors duration-150",
                        active
                          ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                          : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {pt}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-6">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium text-foreground">Card preview</h3>
              <span className="text-xs text-muted-foreground">As listed on /blogs</span>
            </div>

            <div className="flex gap-4 rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="min-w-0 flex-1">
                {tags.length > 0 && (
                  <p className="mb-1 truncate text-xs font-medium text-muted-foreground">
                    {tags.slice(0, 3).join(" · ")}
                  </p>
                )}
                <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{displayTitle}</h4>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {displayExcerpt || "Your summary appears here."}
                </p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={profile?.profile_image ?? undefined} alt="" />
                    <AvatarFallback className="text-3xs">
                      {getInitials(profile?.name ?? user?.email ?? "You")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium text-foreground">{profile?.name || "You"}</span>
                </div>
              </div>
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {coverImage ? (
                  <img src={coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    aria-hidden
                    className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground/60"
                  >
                    {displayTitle.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 flex justify-end border-t border-border bg-background px-6 py-4">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
