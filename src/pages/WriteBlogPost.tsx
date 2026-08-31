import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  Eye,
  Globe,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  Send,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { BlogPostEditor } from "@/components/blog/BlogPostEditor";
import { BlogCoverPicker } from "@/components/blog/BlogCoverPicker";
import { BlogSettingsSheet } from "@/components/blog/BlogSettingsSheet";
import { BlogImageCropDialog } from "@/components/blog/BlogImageCropDialog";
import {
  createBlogPost,
  updateBlogPost,
  getBlogPostBySlug,
  triggerEmbedding,
  slugify,
  uploadBlogPostImage,
  type BlogPost,
} from "@/integrations/supabase/services/blog-posts";

/** Any single-segment route already registered under /blogs/ in App.tsx. */
const RESERVED_SLUGS = new Set(["write"]);

const AUTO_TAG_KEYWORDS: Record<string, string[]> = {
  hackathons: ["hackathon", "hack", "devpost", "prize", "winning", "submission", "prototype"],
  "tech & dev": ["react", "typescript", "python", "code", "coding", "software", "api", "database", "ai", "machine learning"],
  "campus life": ["campus", "hostel", "mess", "srm", "srmap", "amravati", "friends", "club", "events"],
  placements: ["placement", "interview", "resume", "internship", "offer", "package", "ctc", "company"],
  academics: ["exam", "gpa", "cgpa", "professor", "course", "subject", "assignment", "semester"],
  projects: ["project", "built", "showcase", "github", "demo", "app", "website"],
  research: ["research", "paper", "ieee", "publication", "conference", "thesis"],
};

const getInitialLocalDraft = () => {
  try {
    const raw = localStorage.getItem("fl_blog_draft_new");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const WriteBlogPost = () => {
  const { slug: slugParam } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const isEditing = Boolean(slugParam);

  const initialLocalDraft = useMemo(() => (!slugParam ? getInitialLocalDraft() : null), [slugParam]);

  const [loadingExisting, setLoadingExisting] = useState(isEditing);
  const [existing, setExisting] = useState<BlogPost | null>(null);
  const [existingDbDraftId, setExistingDbDraftId] = useState<string | null>(() => initialLocalDraft?.dbDraftId || null);
  const [submitting, setSubmitting] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEditing);

  const [title, setTitle] = useState(() => initialLocalDraft?.title || "");
  const [slug, setSlug] = useState(() => initialLocalDraft?.slug || "");
  const [excerpt, setExcerpt] = useState(() => initialLocalDraft?.excerpt || "");
  const [tags, setTags] = useState<string[]>(() => initialLocalDraft?.tags || []);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(() => initialLocalDraft?.coverImageUrl || null);
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [contentHtml, setContentHtml] = useState(() => initialLocalDraft?.contentHtml || "");
  const [contentText, setContentText] = useState(() => initialLocalDraft?.contentText || "");
  const [isPublished, setIsPublished] = useState(false);

  // Creative Mode States
  const [focusMode, setFocusMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize title input
  const adjustTitleHeight = () => {
    if (titleTextareaRef.current) {
      titleTextareaRef.current.style.height = "auto";
      titleTextareaRef.current.style.height = `${titleTextareaRef.current.scrollHeight}px`;
    }
  };

  // Auto-extracted excerpt from first 1-2 paragraphs (clean text)
  const autoExcerpt = useMemo(() => {
    if (!contentText) return "";
    const clean = contentText.replace(/\s+/g, " ").trim();
    if (clean.length <= 160) return clean;
    const truncated = clean.slice(0, 160);
    const lastSpace = truncated.lastIndexOf(" ");
    return lastSpace > 100 ? `${truncated.slice(0, lastSpace)}...` : `${truncated}...`;
  }, [contentText]);

  // Dynamic Word Count & Reading Time
  const { wordCount, readingTimeMinutes } = useMemo(() => {
    const combinedText = `${title} ${contentText}`.trim();
    if (!combinedText) return { wordCount: 0, readingTimeMinutes: 1 };
    const words = combinedText.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readingTimeMinutes: minutes };
  }, [title, contentText]);

  // Load existing post if editing
  useEffect(() => {
    if (!slugParam) {
      if (initialLocalDraft && (initialLocalDraft.title || initialLocalDraft.contentHtml)) {
        toast.info("Restored draft from your browser", { duration: 3000 });
      }
      return;
    }

    getBlogPostBySlug(slugParam).then((post) => {
      if (!post) {
        toast.error("Post not found");
        navigate("/blogs");
        return;
      }
      if (user && post.author_id !== user.id && !isAdmin) {
        toast.error("You can only edit your own posts");
        navigate(`/blogs/${post.slug}`);
        return;
      }
      setExisting(post);
      setExistingDbDraftId(post.id);
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt ?? "");
      setTags(post.tags);
      setCoverImageUrl(post.cover_image_url);
      setContentHtml(post.content_html);
      setContentText(post.content_text);
      setIsPublished(post.is_published);
      setLoadingExisting(false);
    });
  }, [slugParam, user?.id]);

  // Auto-resize title when title changes
  useEffect(() => {
    adjustTitleHeight();
  }, [title]);

  // Dual Auto-Save: Saves to localStorage AND syncs draft row to Supabase database (debounced)
  useEffect(() => {
    if (isEditing && !existing) return;
    if (!title.trim() && !contentHtml.trim()) return;

    setSaveStatus("saving");

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const targetId = existing?.id || existingDbDraftId;
        const targetSlug = (slug.trim() || slugify(title.trim() || "draft")).trim();

        // 1. Immediate local storage snapshot
        localStorage.setItem(
          "fl_blog_draft_new",
          JSON.stringify({
            title,
            slug: targetSlug,
            excerpt,
            tags,
            coverImageUrl,
            contentHtml,
            contentText,
            dbDraftId: targetId,
            updatedAt: Date.now(),
          })
        );

        // 2. Cloud Database Sync (if user is authenticated)
        if (user) {
          const draftPayload = {
            title: title.trim() || "Untitled Draft",
            slug: targetSlug || `draft-${Date.now().toString(36)}`,
            excerpt: excerpt.trim() || autoExcerpt.trim() || null,
            cover_image_url: coverImageUrl,
            content_html: contentHtml,
            content_text: contentText || "",
            tags: deriveFinalTags(),
            is_published: false,
          };

          if (targetId) {
            await updateBlogPost(targetId, draftPayload);
          } else if (!isEditing) {
            try {
              const created = await createBlogPost(user.id, draftPayload);
              if (created?.id) {
                setExistingDbDraftId(created.id);
                localStorage.setItem(
                  "fl_blog_draft_new",
                  JSON.stringify({
                    title,
                    slug: targetSlug,
                    excerpt,
                    tags,
                    coverImageUrl,
                    contentHtml,
                    contentText,
                    dbDraftId: created.id,
                    updatedAt: Date.now(),
                  })
                );
              }
            } catch {
              // Slug uniqueness fallback
              const uniqueSlug = `${targetSlug}-${Date.now().toString(36).slice(-4)}`;
              const created = await createBlogPost(user.id, { ...draftPayload, slug: uniqueSlug });
              if (created?.id) {
                setExistingDbDraftId(created.id);
              }
            }
          }
        }

        setSaveStatus("saved");
      } catch (err) {
        console.warn("Auto-save sync warning:", err);
        setSaveStatus("saved");
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, slug, excerpt, tags, coverImageUrl, contentHtml, contentText, user?.id, isEditing, existing?.id, existingDbDraftId]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  };

  const handleCoverCropped = async (file: File) => {
    setUploadingCover(true);
    try {
      const { url } = await uploadBlogPostImage(file);
      setCoverImageUrl(url);
      setPendingCoverFile(null);
      toast.success("Cover image updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to upload cover image"));
    } finally {
      setUploadingCover(false);
    }
  };

  // Derive smart auto-tags if none explicitly chosen
  const deriveFinalTags = () => {
    if (tags.length > 0) return tags;
    const fullText = `${title} ${contentText}`.toLowerCase();
    const detected: string[] = [];

    for (const [tag, keywords] of Object.entries(AUTO_TAG_KEYWORDS)) {
      if (keywords.some((kw) => fullText.includes(kw))) {
        detected.push(tag);
      }
      if (detected.length >= 3) break;
    }

    return detected.length > 0 ? detected : ["campus"];
  };

  const handleSubmit = async (publish: boolean) => {
    if (!user) {
      toast.error(publish ? "Please sign in to publish your post" : "Please sign in to save your draft");
      return;
    }

    const trimmedTitle = title.trim();
    const finalSlug = (slug.trim() || slugify(trimmedTitle || "untitled-draft")).trim();
    const finalExcerpt = excerpt.trim() || autoExcerpt.trim() || null;
    const finalTags = deriveFinalTags();

    if (publish && !trimmedTitle) {
      toast.error("Please enter a title for your post");
      titleTextareaRef.current?.focus();
      return;
    }

    if (publish && !contentText.trim()) {
      toast.error("Please write some content in your post");
      return;
    }

    if (RESERVED_SLUGS.has(finalSlug.toLowerCase())) {
      toast.error(`"${finalSlug}" is a reserved URL — please change the slug in settings`);
      setSettingsOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: trimmedTitle || "Untitled Draft",
        slug: finalSlug,
        excerpt: finalExcerpt,
        cover_image_url: coverImageUrl,
        content_html: contentHtml,
        content_text: contentText,
        tags: finalTags,
        is_published: publish,
      };

      const targetId = isEditing && existing ? existing.id : existingDbDraftId;

      if (targetId) {
        await updateBlogPost(targetId, payload);
      } else {
        const created = await createBlogPost(user.id, payload);
        if (!publish && created?.id) {
          setExistingDbDraftId(created.id);
        }
      }

      if (publish) {
        localStorage.removeItem("fl_blog_draft_new");
        triggerEmbedding();
        toast.success("🎉 Post published to Community Blog!");
        navigate(`/blogs/${finalSlug}`);
      } else {
        toast.success("💾 Draft saved to cloud and browser!");
        navigate("/blogs");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, `Failed to ${isEditing ? "update" : "publish"} post`));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading your story...</p>
        </div>
      </div>
    );
  }

  const safePreviewHtml = sanitizeBlogHtml(contentHtml);

  return (
    <>
      <SEOHead title={isEditing ? `Edit "${title || "Post"}" | Community Blog` : "Write a Post | Community Blog"} />

      <div className={cn("transition-all", focusMode ? "fixed inset-0 z-50 overflow-y-auto bg-background flex flex-col" : "min-h-screen bg-background flex flex-col")}>
        {/* Top Floating Word/Notion Action Header */}
        <header className={cn("z-40 w-full border-b border-border/70 bg-background/95 backdrop-blur-md transition-all", focusMode ? "sticky top-0" : "sticky top-16")}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-2">
            {/* Left: Navigation & Status */}
            <div className="flex items-center gap-3">
              <Link
                to="/blogs"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-muted"
                title="Back to Community Blog"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Community Blog</span>
              </Link>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* Live Save Status */}
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground select-none">
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    <span>Saving draft...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span>Auto-saved</span>
                  </>
                )}
              </div>
            </div>

            {/* Middle: Stats Pill (tablet & desktop) */}
            <div className="hidden md:flex items-center gap-2">
              <div className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/50">
                {wordCount} words · {readingTimeMinutes} min read
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Focus / Zen Mode */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={focusMode ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setFocusMode(!focusMode)}
                  >
                    {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {focusMode ? "Exit Zen Mode" : "Focus Mode (Distraction-Free)"}
                </TooltipContent>
              </Tooltip>

              {/* Preview Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={previewMode ? "secondary" : "ghost"}
                    size="sm"
                    className="h-8 text-xs gap-1.5 px-2.5"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    {previewMode ? (
                      <>
                        <Pencil className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Edit</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Preview</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {previewMode ? "Return to editor" : "Preview how readers see your post"}
                </TooltipContent>
              </Tooltip>

              {/* Settings Drawer Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs gap-1.5 px-2 text-muted-foreground hover:text-foreground relative"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden lg:inline">Settings</span>
                    {tags.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-primary" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Custom slug, tags, & card preview</TooltipContent>
              </Tooltip>

              <div className="h-4 w-px bg-border mx-0.5" />

              {/* Save Draft */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                disabled={submitting}
                onClick={() => handleSubmit(false)}
              >
                {submitting ? "Saving..." : "Save Draft"}
              </Button>

              {/* Publish Button */}
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 shadow-sm bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>{isPublished ? "Update Post" : "Publish"}</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Writing Canvas */}
        <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {previewMode ? (
            /* Live Reader Preview Mode */
            <div className="animate-in fade-in-50 duration-200 space-y-6">
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 shrink-0" />
                  <span>
                    <strong>Reader Preview Mode:</strong> This is exactly how your article will look once published.
                  </span>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPreviewMode(false)}>
                  Back to Editing
                </Button>
              </div>

              {/* Preview Article Body */}
              <article className="space-y-6">
                {coverImageUrl && (
                  <div className="w-full h-64 sm:h-80 rounded-2xl overflow-hidden border border-border/60">
                    {coverImageUrl.startsWith("gradient:") ? (
                      <div className="w-full h-full" style={{ background: coverImageUrl.replace("gradient:", "") }} />
                    ) : (
                      <img src={coverImageUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="font-normal">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  {title.trim() || "Untitled Post"}
                </h1>

                <div className="flex items-center gap-3 border-b border-border pb-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{profile?.name || user?.email || "You"}</span>
                    <span>·</span>
                    <span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    <span>·</span>
                    <span>{readingTimeMinutes} min read</span>
                  </div>
                </div>

                <div
                  className="prose prose-base sm:prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: safePreviewHtml || "<p className='text-muted-foreground italic'>No content written yet...</p>" }}
                />
              </article>
            </div>
          ) : (
            /* Standard Write-First Canvas */
            <div className="space-y-6">
              {/* Notion-Style Cover Banner */}
              <BlogCoverPicker
                coverUrl={coverImageUrl}
                onSelectCover={setCoverImageUrl}
                onRequestUpload={() => coverFileInputRef.current?.click()}
                uploading={uploadingCover}
              />

              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) setPendingCoverFile(file);
                }}
              />

              {/* Large Borderless Document Title */}
              <div className="pt-2">
                <textarea
                  ref={titleTextareaRef}
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Untitled story..."
                  rows={1}
                  className="w-full resize-none overflow-hidden bg-transparent text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground placeholder:text-muted-foreground/30 border-0 focus:outline-none focus:ring-0 p-0 leading-tight"
                />
              </div>

              {/* Word-Style TipTap Editor */}
              <div className="pt-2">
                <BlogPostEditor
                  content={contentHtml}
                  onChange={(html, text) => {
                    setContentHtml(html);
                    setContentText(text);
                  }}
                  placeholder="Start typing your story freely..."
                  focusMode={focusMode}
                />
              </div>
            </div>
          )}
        </div>

        {!focusMode && <Footer />}
      </div>

      {/* Slide-out Post Settings Sheet (Optional for power users) */}
      <BlogSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title={title}
        slug={slug}
        onSlugChange={(newSlug) => {
          setSlugTouched(true);
          setSlug(newSlug);
        }}
        excerpt={excerpt}
        onExcerptChange={setExcerpt}
        tags={tags}
        onTagsChange={setTags}
        coverUrl={coverImageUrl}
        autoExcerpt={autoExcerpt}
      />

      {/* Image Crop Dialog for Cover */}
      <BlogImageCropDialog
        file={pendingCoverFile}
        saving={uploadingCover}
        onCancel={() => setPendingCoverFile(null)}
        onCropped={handleCoverCropped}
      />
    </>
  );
};

export default WriteBlogPost;
