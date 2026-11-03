import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CloudOff,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  Pencil,
  RotateCw,
  Settings2,
} from "lucide-react";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { getInitials } from "@/utils/user-utils";
import { ARTICLE_PROSE, coverImageOf } from "@/components/blog/article-prose";
import { BlogPostEditor } from "@/components/blog/BlogPostEditor";
import { BlogCoverPicker } from "@/components/blog/BlogCoverPicker";
import { BlogSettingsSheet } from "@/components/blog/BlogSettingsSheet";
import { BlogImageCropDialog } from "@/components/blog/BlogImageCropDialog";
import {
  createBlogPost,
  updateBlogPost,
  getBlogPostBySlug,
  uploadBlogPostImage,
  type BlogPost,
} from "@/integrations/supabase/services/blog-posts";
import { titleToSlug as slugify } from "@/integrations/supabase/services/knowledge-sync";

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

  const [focusMode, setFocusMode] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<"draft" | "publish" | null>(null);
  // "idle" until the first edit, so a blank page doesn't claim to be saved.
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => initialLocalDraft?.updatedAt ?? null);
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const titleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const subtitleTextareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fitToContent = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
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
        toast.info("Restored your unsaved draft from this browser", { duration: 3000 });
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

  useEffect(() => {
    fitToContent(titleTextareaRef.current);
  }, [title, previewMode]);

  useEffect(() => {
    fitToContent(subtitleTextareaRef.current);
  }, [excerpt, previewMode]);

  // Keeps "Saved 2 min ago" honest without re-rendering on every second.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

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

        setLastSavedAt(Date.now());
        setNow(Date.now());
        setSaveStatus("saved");
      } catch (err) {
        // The localStorage snapshot above has usually succeeded, but the
        // server copy hasn't; say so instead of claiming it's saved.
        console.warn("Auto-save sync failed:", err);
        setSaveStatus("error");
      }
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, slug, excerpt, tags, coverImageUrl, contentHtml, contentText, user?.id, isEditing, existing?.id, existingDbDraftId, saveAttempt]);

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
      toast.error(getErrorMessage(error, "Couldn't upload the cover image. Try again."));
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
      toast.error(publish ? "Sign in to publish your post" : "Sign in to save your draft");
      return;
    }

    const trimmedTitle = title.trim();
    const finalSlug = (slug.trim() || slugify(trimmedTitle || "untitled-draft")).trim();
    const finalExcerpt = excerpt.trim() || autoExcerpt.trim() || null;
    const finalTags = deriveFinalTags();

    if (publish && !trimmedTitle) {
      toast.error("Add a title before publishing");
      titleTextareaRef.current?.focus();
      return;
    }

    if (publish && !contentText.trim()) {
      toast.error("Write something in the body before publishing");
      return;
    }

    if (RESERVED_SLUGS.has(finalSlug.toLowerCase())) {
      toast.error(`"/blogs/${finalSlug}" is a reserved address. Choose a different URL in Settings.`);
      setSettingsOpen(true);
      return;
    }

    setSubmitting(true);
    setSubmitIntent(publish ? "publish" : "draft");
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
        // No embed-knowledge call here: it only accepts admins, so from a
        // student's session it was a guaranteed, silent 401. The
        // embed-knowledge-topup cron embeds the post within 10 minutes.
        localStorage.removeItem("fl_blog_draft_new");
        toast.success("Post published to Community Blog.");
        navigate(`/blogs/${finalSlug}`);
      } else {
        toast.success("Draft saved.");
        navigate("/blogs");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, publish ? `Couldn't ${isPublished ? "update" : "publish"} the post. Try again.` : "Couldn't save the draft. Try again."));
    } finally {
      setSubmitting(false);
      setSubmitIntent(null);
    }
  };

  if (loadingExisting) {
    return (
      <div className="min-h-screen bg-background" aria-busy="true" aria-label="Loading post">
        <div className="sticky top-16 z-40 h-14 border-b border-border bg-background" />
        <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-4 py-10 sm:px-6">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-12 w-4/5" />
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="mt-6 h-10 w-full" />
          <div className="mt-4 flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  const safePreviewHtml = sanitizeBlogHtml(contentHtml);
  const previewCover = coverImageOf(coverImageUrl);

  const missingForPublish = !title.trim()
    ? "Add a title to publish."
    : !contentText.trim()
    ? "Write the body to publish."
    : null;
  const authorName = profile?.name || user?.email || "You";

  const focusEditorBody = () => {
    canvasRef.current?.querySelector<HTMLElement>(".ProseMirror")?.focus();
  };

  return (
    <>
      <SEOHead title={isEditing ? `Edit "${title || "Post"}" | Community Blog` : "Write a Post | Community Blog"} />

      <div className={cn(focusMode ? "fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background" : "flex min-h-screen flex-col bg-background")}>
        <header className={cn("sticky z-40 w-full border-b border-border bg-background", focusMode ? "top-0" : "top-16")}>
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-1 sm:gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to="/blogs"
                    aria-label="Back to Community Blog"
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="hidden lg:inline">Community Blog</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom">Back to Community Blog. Your draft is kept.</TooltipContent>
              </Tooltip>

              <span aria-hidden className="hidden h-4 w-px bg-border sm:block" />

              <SaveIndicator
                status={saveStatus}
                lastSavedAt={lastSavedAt}
                now={now}
                signedIn={Boolean(user)}
                onRetry={() => setSaveAttempt((n) => n + 1)}
              />
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <span className="mr-2 hidden text-xs text-muted-foreground tabular md:inline">
                {wordCount.toLocaleString("en-IN")} {wordCount === 1 ? "word" : "words"} · {readingTimeMinutes} min read
              </span>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="hidden h-9 w-9 text-muted-foreground md:inline-flex"
                    aria-pressed={focusMode}
                    aria-label={focusMode ? "Exit focus mode" : "Focus mode"}
                    onClick={() => setFocusMode(!focusMode)}
                  >
                    {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {focusMode ? "Exit focus mode" : "Focus mode: hide the site navigation"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground"
                    aria-label="Post settings"
                    onClick={() => setSettingsOpen(true)}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">URL, summary and tags</TooltipContent>
              </Tooltip>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 gap-1.5 px-2.5"
                aria-pressed={previewMode}
                onClick={() => setPreviewMode(!previewMode)}
              >
                {previewMode ? <Pencil className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="hidden sm:inline">{previewMode ? "Edit" : "Preview"}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden h-9 sm:inline-flex"
                disabled={submitting}
                isLoading={submitIntent === "draft"}
                onClick={() => handleSubmit(false)}
              >
                Save draft
              </Button>

              {missingForPublish ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* Disabled buttons swallow pointer events, so this span
                        carries the tooltip explaining what's missing. */}
                    <span tabIndex={0} className="inline-flex rounded-md">
                      <Button type="button" size="sm" className="h-9 px-4" disabled>
                        {isPublished ? "Update" : "Publish"}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{missingForPublish}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-9 px-4"
                  disabled={submitting}
                  isLoading={submitIntent === "publish"}
                  onClick={() => handleSubmit(true)}
                >
                  {isPublished ? "Update" : "Publish"}
                </Button>
              )}
            </div>
          </div>
        </header>

        <div ref={canvasRef} className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
          {previewMode ? (
            <div className="flex flex-col gap-8 animate-fade-in">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary px-4 py-2 text-sm text-secondary-foreground">
                <span className="flex min-w-0 items-center gap-2">
                  <Eye className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">Preview of the published post</span>
                </span>
                <Button size="sm" variant="ghost" className="h-8 shrink-0" onClick={() => setPreviewMode(false)}>
                  Back to editing
                </Button>
              </div>

              <article className="flex flex-col gap-6">
                <header className="flex flex-col gap-4">
                  <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-5xl">
                    {title.trim() || <span className="text-muted-foreground">Untitled</span>}
                  </h1>
                  {excerpt.trim() && (
                    <p className="text-xl leading-relaxed text-muted-foreground">{excerpt.trim()}</p>
                  )}
                  <div className="flex items-center gap-3 border-y border-border py-4 text-sm">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile?.profile_image ?? undefined} alt="" />
                      <AvatarFallback className="text-xs">{getInitials(authorName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium text-foreground">{authorName}</span>
                      <span className="text-muted-foreground tabular">
                        {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {readingTimeMinutes} min read
                      </span>
                    </div>
                  </div>
                </header>

                {previewCover && (
                  <figure className="overflow-hidden rounded-lg border border-border">
                    <img src={previewCover} alt="" className="aspect-[16/9] w-full object-cover" />
                  </figure>
                )}

                {safePreviewHtml.trim() ? (
                  <div className={ARTICLE_PROSE} dangerouslySetInnerHTML={{ __html: safePreviewHtml }} />
                ) : (
                  <p className="text-muted-foreground">Nothing in the body yet. Go back to editing to write it.</p>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-6">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            </div>
          ) : (
            <div className="flex flex-col">
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

              <textarea
                ref={titleTextareaRef}
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  // A title is one line; Enter moves on to the subtitle.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    subtitleTextareaRef.current?.focus();
                  }
                }}
                placeholder="Title"
                aria-label="Title"
                rows={1}
                className="mt-6 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-4xl font-semibold leading-[1.15] tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 focus-visible:outline-none md:text-5xl"
              />

              <textarea
                ref={subtitleTextareaRef}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value.replace(/\n/g, " "))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    focusEditorBody();
                  }
                }}
                maxLength={SUBTITLE_MAX}
                placeholder="Add a subtitle (optional)"
                aria-label="Subtitle"
                aria-describedby="subtitle-hint"
                rows={1}
                className="mt-3 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-xl leading-relaxed text-muted-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-0 focus-visible:outline-none"
              />
              <p id="subtitle-hint" className="mt-1 flex h-4 justify-end text-2xs text-muted-foreground tabular">
                {excerpt.length > SUBTITLE_MAX - 40 && `${excerpt.length}/${SUBTITLE_MAX}`}
              </p>

              <div className="mt-4">
                <BlogPostEditor
                  content={contentHtml}
                  onChange={(html, text) => {
                    setContentHtml(html);
                    setContentText(text);
                  }}
                  placeholder="Tell your story…"
                  focusMode={focusMode}
                />
              </div>
            </div>
          )}
        </div>

        {!focusMode && <Footer />}
      </div>

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

      <BlogImageCropDialog
        file={pendingCoverFile}
        saving={uploadingCover}
        onCancel={() => setPendingCoverFile(null)}
        onCropped={handleCoverCropped}
      />
    </>
  );
};

/** The subtitle doubles as the post's summary on cards and in search results. */
const SUBTITLE_MAX = 240;

const savedAgo = (ts: number, now: number) => {
  const seconds = Math.max(0, (now - ts) / 1000);
  if (seconds < 45) return "Saved just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Saved ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Saved ${hours} h ago`;
  return `Saved ${new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
};

interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
  lastSavedAt: number | null;
  now: number;
  signedIn: boolean;
  onRetry: () => void;
}

/** Live autosave state; a polite live region so screen readers hear failures. */
const SaveIndicator = ({ status, lastSavedAt, now, signedIn, onRetry }: SaveIndicatorProps) => {
  if (status === "error") {
    return (
      <span role="status" aria-live="polite" className="flex min-w-0 items-center gap-1.5 text-xs text-destructive">
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">Not saved</span>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md px-1.5 font-medium underline-offset-4 hover:underline"
        >
          <RotateCw className="h-3 w-3" />
          Retry
        </button>
      </span>
    );
  }

  let label: string;
  if (status === "saving") label = "Saving…";
  else if (lastSavedAt) label = savedAgo(lastSavedAt, now);
  else label = "Draft";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          aria-live="polite"
          tabIndex={0}
          className="flex min-w-0 items-center gap-1.5 rounded-md px-1 text-xs text-muted-foreground tabular"
        >
          {status === "saving" ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : lastSavedAt ? (
            <Check className="h-3.5 w-3.5 shrink-0" />
          ) : null}
          <span className="truncate">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {signedIn
          ? "Changes save to your account automatically as you write."
          : "Changes save in this browser. Sign in to keep them across devices."}
      </TooltipContent>
    </Tooltip>
  );
};

export default WriteBlogPost;
