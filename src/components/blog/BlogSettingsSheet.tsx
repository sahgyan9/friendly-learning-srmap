import { useState } from "react";
import { Check, Globe, HelpCircle, Sparkles, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { slugify } from "@/integrations/supabase/services/blog-posts";
import { useAuth } from "@/context/AuthContext";

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

  const isGradient = coverUrl?.startsWith("gradient:") ?? false;
  const gradientStyle = isGradient ? coverUrl?.replace("gradient:", "") : null;
  const displayExcerpt = excerpt.trim() || autoExcerpt.trim() || "Your story summary will appear here...";

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Post Settings & Preview
          </SheetTitle>
          <SheetDescription>
            These are automatically generated for you. Fine-tune them only if you wish.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 pt-5">
          {/* URL Slug Setting */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-slug" className="text-sm font-semibold flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-muted-foreground" />
                URL Slug
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-primary px-2"
                onClick={() => onSlugChange(slugify(title))}
              >
                Reset to Auto
              </Button>
            </div>
            <div className="flex items-center rounded-lg border border-input bg-muted/30 px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:border-ring">
              <span className="text-xs text-muted-foreground select-none shrink-0 font-mono">
                /blogs/
              </span>
              <Input
                id="post-slug"
                value={slug}
                onChange={(e) => onSlugChange(slugify(e.target.value))}
                placeholder="what-i-learned-building-my-first-app"
                className="border-0 bg-transparent p-0 pl-1 text-xs font-mono focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none h-7"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Auto-derived from title. Keep lowercase with hyphens.
            </p>
          </div>

          {/* Short Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-excerpt" className="text-sm font-semibold">
                Short Excerpt
              </Label>
              {excerpt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground px-2"
                  onClick={() => onExcerptChange("")}
                >
                  Clear (use auto)
                </Button>
              )}
            </div>
            <Textarea
              id="post-excerpt"
              value={excerpt}
              onChange={(e) => onExcerptChange(e.target.value)}
              placeholder={autoExcerpt || "Brief 1-2 sentences shown on post cards and in search results..."}
              className="min-h-[80px] text-xs resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              {excerpt.trim()
                ? "Custom excerpt in use."
                : "Using automatic excerpt extracted from your first paragraph."}
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-muted-foreground" />
              Tags & Topics
            </Label>

            {/* Current Active Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/60">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs gap-1 pl-2.5 pr-1.5 py-1 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="rounded-full hover:bg-primary/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Custom Tag Input */}
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Type tag and press Enter..."
                className="h-8 text-xs"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3 shrink-0"
                onClick={() => handleAddTag(tagInput)}
              >
                Add
              </Button>
            </div>

            {/* Suggested Popular Tags */}
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5 font-medium">
                Quick add suggested tags:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {POPULAR_TAGS.map((pt) => {
                  const active = tags.some((t) => t.toLowerCase() === pt.toLowerCase());
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => togglePresetTag(pt)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                          : "bg-background text-muted-foreground border-border/70 hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      {active ? `✓ ${pt}` : `+ ${pt}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Live Feed Card Preview */}
          <div className="space-y-2 pt-2 border-t border-border">
            <Label className="text-sm font-semibold flex items-center justify-between">
              <span>Card Feed Preview</span>
              <span className="text-[11px] font-normal text-muted-foreground">
                How it looks on /blogs
              </span>
            </Label>

            <Card className="overflow-hidden border border-border/80 shadow-sm transition-all">
              <div className="flex flex-col sm:flex-row">
                {coverUrl && (
                  <div className="aspect-video w-full shrink-0 overflow-hidden bg-muted sm:aspect-square sm:w-32">
                    {isGradient ? (
                      <div className="h-full w-full" style={{ background: gradientStyle || "" }} />
                    ) : (
                      <img src={coverUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                )}
                <div className="flex-1 p-4">
                  {tags.length > 0 && (
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <h4 className="text-sm font-bold leading-snug tracking-tight text-foreground line-clamp-2">
                    {title.trim() || "Untitled Post"}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {displayExcerpt}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={profile?.profile_image ?? undefined} alt="" />
                      <AvatarFallback className="text-[9px]">
                        {getInitials(profile?.name ?? user?.email ?? "You")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">
                      {profile?.name || "You"}
                    </span>
                    <span>·</span>
                    <span>Just now</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
