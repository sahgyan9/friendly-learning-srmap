import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, FileText, PenLine, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HorizontalScroller } from "@/components/ui/HorizontalScroller";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/context/AuthContext";
import { useBlogPosts, useMyBlogPosts } from "@/hooks/useBlogPosts";
import { getInitials } from "@/utils/user-utils";
import { cn } from "@/lib/utils";
import { coverImageOf } from "@/components/blog/article-prose";
import { deleteBlogPost, type BlogPostSummary } from "@/integrations/supabase/services/blog-posts";

const BLOG_CATEGORIES = [
  "All",
  "Hackathons",
  "Tech & Dev",
  "Campus Life",
  "Placements",
  "Academics",
  "Projects",
  "Research",
];

const LOCAL_DRAFT_KEY = "fl_blog_draft_new";

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

interface LocalDraftInfo {
  title?: string;
  excerpt?: string;
  contentHtml?: string;
  contentText?: string;
  slug?: string;
  updatedAt?: number;
  dbDraftId?: string;
}

/** Stagger only the first few rows; later ones appear with the batch. */
const stagger = (index: number) =>
  index < 6 ? { className: "animate-fade-up", style: { animationDelay: `${index * 35}ms`, animationFillMode: "both" as const } } : {};

/**
 * Stands in for a missing cover: the title's first letter set large on a
 * neutral surface, so a post without a photo still has a recognisable mark.
 */
const CoverFallback = ({ title, className }: { title: string; className?: string }) => (
  <div aria-hidden className={cn("flex items-center justify-center bg-muted", className)}>
    <span className="select-none font-semibold leading-none tracking-tight text-muted-foreground/40">
      {(title.trim().charAt(0) || "·").toUpperCase()}
    </span>
  </div>
);

const Byline = ({ post }: { post: BlogPostSummary }) => (
  <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
    <Avatar className="h-6 w-6 shrink-0">
      <AvatarImage src={post.author_image ?? undefined} alt="" />
      <AvatarFallback className="text-3xs">{getInitials(post.author_name ?? "Student")}</AvatarFallback>
    </Avatar>
    <span className="truncate font-medium text-foreground">{post.author_name ?? "Student"}</span>
    {post.published_at && (
      <>
        <span aria-hidden>·</span>
        <time dateTime={post.published_at} className="shrink-0 tabular">
          {formatDate(post.published_at)}
        </time>
      </>
    )}
    {post.view_count > 0 && (
      <span className="hidden shrink-0 items-center gap-1 tabular sm:flex">
        <span aria-hidden>·</span>
        <Eye className="h-3.5 w-3.5" aria-hidden />
        {post.view_count.toLocaleString("en-IN")}
        <span className="sr-only">views</span>
      </span>
    )}
  </div>
);

const FeaturedPost = ({ post }: { post: BlogPostSummary }) => {
  const cover = coverImageOf(post.cover_image_url);
  return (
    <Link
      to={`/blogs/${post.slug}`}
      className="group grid min-w-0 gap-6 rounded-xl md:grid-cols-[1.15fr_1fr] md:items-center md:gap-10 animate-fade-up"
    >
      <div className="overflow-hidden rounded-lg border border-border">
        {cover ? (
          <img src={cover} alt="" className="aspect-[16/10] w-full object-cover" />
        ) : (
          <CoverFallback title={post.title} className="aspect-[16/10] w-full text-8xl" />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <p className="text-sm font-medium text-muted-foreground">
          Latest{post.tags[0] ? <> · <span className="text-primary">{post.tags[0]}</span></> : null}
        </p>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground underline-offset-4 decoration-foreground/30 group-hover:underline md:text-3xl">
          {post.title}
        </h2>
        {post.excerpt && <p className="line-clamp-3 leading-relaxed text-muted-foreground">{post.excerpt}</p>}
        <div className="mt-1">
          <Byline post={post} />
        </div>
      </div>
    </Link>
  );
};

const PostRow = ({ post, index }: { post: BlogPostSummary; index: number }) => {
  const cover = coverImageOf(post.cover_image_url);
  const motion = stagger(index);
  return (
    <li className={motion.className} style={motion.style}>
      <Link
        to={`/blogs/${post.slug}`}
        className="group -mx-3 flex min-w-0 items-start gap-4 rounded-lg px-3 py-6 transition-colors duration-150 hover:bg-accent/60 sm:gap-6"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {post.tags.length > 0 && (
            <p className="truncate text-xs font-medium text-muted-foreground">{post.tags.slice(0, 3).join(" · ")}</p>
          )}
          <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground underline-offset-4 decoration-foreground/30 group-hover:underline sm:text-xl">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
          )}
          <div className="mt-1">
            <Byline post={post} />
          </div>
        </div>
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border border-border sm:h-28 sm:w-36">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <CoverFallback title={post.title} className="h-full w-full text-4xl" />
          )}
        </div>
      </Link>
    </li>
  );
};

const Blogs = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState<"community" | "my_stories">("community");
  const [localDraft, setLocalDraft] = useState<LocalDraftInfo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.title?.trim() || parsed.contentHtml?.trim()) {
          setLocalDraft(parsed);
        }
      }
    } catch {
      // A corrupt or blocked localStorage entry just means no draft banner.
    }
  }, []);

  const filterTag = selectedCategory === "All" ? undefined : selectedCategory.toLowerCase();
  const { posts, loading } = useBlogPosts({
    search: search.trim() || undefined,
    tag: filterTag,
    limit: 30,
  });

  const { posts: myPosts, loading: myPostsLoading, refetch: refetchMyPosts } = useMyBlogPosts();

  const handleDiscardLocalDraft = () => {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    const discarded = localDraft;
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    setLocalDraft(null);
    // Cheap to undo, so offer that instead of a confirmation step.
    toast("Browser draft discarded", {
      action: raw
        ? {
            label: "Undo",
            onClick: () => {
              localStorage.setItem(LOCAL_DRAFT_KEY, raw);
              setLocalDraft(discarded);
            },
          }
        : undefined,
    });
  };

  const handleDeletePost = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteBlogPost(pendingDelete.id);
      toast.success("Post deleted");
      refetchMyPosts();
    } catch {
      toast.error("Couldn't delete the post. Try again.");
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const hasActiveLocalDraft = Boolean(localDraft && (localDraft.title?.trim() || localDraft.contentHtml?.trim()));
  const latestDbDraft = myPosts.find((p) => !p.is_published);
  const isFiltered = Boolean(search.trim()) || selectedCategory !== "All";
  const [featured, ...rest] = posts;
  const listPosts = isFiltered ? posts : rest;

  return (
    <>
      <SEOHead
        title="Community Blog | Friendly Learning SRMAP"
        description="Long-form writing by SRM AP students and mentors — hackathon recaps, course notes, and campus life, written by the people living it."
        canonical={`${PRIMARY_DOMAIN}/blogs`}
      />

      <div className="flex min-h-screen flex-col bg-background">
        <header className="border-b border-border">
          <div className="container mx-auto max-w-5xl px-4 pt-24 sm:pt-28">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Community Blog</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Writing by SRM AP students and mentors: hackathon recaps, project write-ups, course notes and campus life.
                </p>
              </div>
              <Button asChild className="shrink-0 gap-2 self-start md:self-auto">
                <Link to="/blogs/write">
                  <PenLine className="h-4 w-4" />
                  {user ? "Write a post" : "Sign in to write"}
                </Link>
              </Button>
            </div>

            {user ? (
              <div role="tablist" aria-label="Blog views" className="mt-8 flex items-center gap-6">
                {(
                  [
                    { id: "community", label: "All posts" },
                    { id: "my_stories", label: "Your posts" },
                  ] as const
                ).map((tab) => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "-mb-px flex h-11 cursor-pointer items-center gap-2 border-b-2 text-sm font-medium transition-colors duration-150",
                        active
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab.label}
                      {tab.id === "my_stories" && myPosts.length > 0 && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground tabular">
                          {myPosts.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="h-8" />
            )}
          </div>
        </header>

        <main className="container mx-auto max-w-5xl flex-1 px-4 py-8">
          {(hasActiveLocalDraft || latestDbDraft) && (
            <section
              aria-label="Unfinished draft"
              className="mb-10 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Pencil className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {hasActiveLocalDraft ? "Unfinished draft" : "Saved draft"}
                    {localDraft?.updatedAt && hasActiveLocalDraft && (
                      <span className="tabular"> · edited {formatDate(new Date(localDraft.updatedAt).toISOString())}</span>
                    )}
                  </p>
                  <h2 className="mt-0.5 truncate font-semibold text-foreground">
                    {localDraft?.title?.trim() || latestDbDraft?.title || "Untitled"}
                  </h2>
                  {(localDraft?.excerpt || latestDbDraft?.excerpt) && (
                    <p className="truncate text-sm text-muted-foreground">
                      {localDraft?.excerpt || latestDbDraft?.excerpt}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                {hasActiveLocalDraft && (
                  <Button type="button" variant="ghost" size="sm" className="h-9" onClick={handleDiscardLocalDraft}>
                    Discard
                  </Button>
                )}
                <Button asChild size="sm" className="h-9">
                  <Link to={latestDbDraft && !hasActiveLocalDraft ? `/blogs/${latestDbDraft.slug}/edit` : "/blogs/write"}>
                    Continue writing
                  </Link>
                </Button>
              </div>
            </section>
          )}

          {activeTab === "my_stories" ? (
            <section aria-labelledby="your-posts-heading" className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="your-posts-heading" className="text-xl font-semibold tracking-tight text-foreground">
                    Your posts
                  </h2>
                  <p className="text-sm text-muted-foreground">Published posts and drafts. Drafts are visible only to you.</p>
                </div>
              </div>

              {myPostsLoading ? (
                <ul className="divide-y divide-border border-y border-border">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center gap-4 py-4">
                      <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-9 w-20" />
                    </li>
                  ))}
                </ul>
              ) : myPosts.length === 0 ? (
                <div className="flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">You haven't written anything yet</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    A hackathon recap, a project walkthrough or a note on a course you've taken is a good first post.
                  </p>
                  <Button asChild size="sm" className="mt-5">
                    <Link to="/blogs/write">Write a post</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border border-y border-border">
                  {myPosts.map((post, index) => {
                    const motion = stagger(index);
                    return (
                      <li
                        key={post.id}
                        className={cn("flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between", motion.className)}
                        style={motion.style}
                      >
                        <div className="min-w-0">
                          <Link
                            to={post.is_published ? `/blogs/${post.slug}` : `/blogs/${post.slug}/edit`}
                            className="line-clamp-2 font-semibold text-foreground underline-offset-4 hover:underline"
                          >
                            {post.title}
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-xs font-medium",
                                post.is_published
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                              )}
                            >
                              {post.is_published ? "Published" : "Draft"}
                            </span>
                            <span className="tabular">
                              {post.is_published ? "" : "Edited "}
                              {formatDate(post.is_published ? post.published_at || post.created_at : post.updated_at || post.created_at)}
                            </span>
                            {post.is_published && (
                              <span className="flex items-center gap-1 tabular">
                                <span aria-hidden>·</span>
                                {post.view_count.toLocaleString("en-IN")} {post.view_count === 1 ? "view" : "views"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button asChild size="sm" variant="outline" className="h-9 gap-1.5">
                            <Link to={`/blogs/${post.slug}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setPendingDelete({ id: post.id, title: post.title })}
                            aria-label={`Delete "${post.title}"`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            <>
              <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:w-72 md:shrink-0">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search posts"
                    aria-label="Search posts"
                    className="h-10 pl-9"
                  />
                </div>

                <HorizontalScroller ariaLabel="Filter by topic" className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {BLOG_CATEGORIES.map((cat) => {
                      const active = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setSelectedCategory(cat)}
                          className={cn(
                            "h-9 cursor-pointer whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors duration-150",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                          )}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </HorizontalScroller>
              </div>

              {loading ? (
                <div className="flex flex-col gap-10" aria-busy="true" aria-label="Loading posts">
                  {!isFiltered && (
                    <div className="grid gap-6 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-10">
                      <Skeleton className="aspect-[16/10] w-full rounded-lg" />
                      <div className="flex flex-col gap-3">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-5 w-48" />
                      </div>
                    </div>
                  )}
                  <ul className="divide-y divide-border">
                    {[0, 1, 2, 3].map((i) => (
                      <li key={i} className="flex gap-6 py-6">
                        <div className="flex flex-1 flex-col gap-2">
                          <Skeleton className="h-3 w-24" />
                          <Skeleton className="h-6 w-4/5" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-5 w-44" />
                        </div>
                        <Skeleton className="h-20 w-20 rounded-md sm:h-28 sm:w-36" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : posts.length === 0 ? (
                <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    {isFiltered ? <Search className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                  </div>
                  <h2 className="font-semibold text-foreground">
                    {isFiltered ? "No posts match" : "No posts yet"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isFiltered
                      ? "Try a different search or topic."
                      : "Nobody has published here yet. Your post would be the first."}
                  </p>
                  {isFiltered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-5"
                      onClick={() => {
                        setSearch("");
                        setSelectedCategory("All");
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button asChild size="sm" className="mt-5">
                      <Link to="/blogs/write">Write a post</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  {!isFiltered && featured && <FeaturedPost post={featured} />}
                  {listPosts.length > 0 && (
                    <section aria-label={isFiltered ? "Results" : "More posts"}>
                      {!isFiltered && (
                        <h2 className="border-b border-border pb-3 text-sm font-medium text-muted-foreground">
                          More posts
                        </h2>
                      )}
                      <ul className="divide-y divide-border">
                        {listPosts.map((post, index) => (
                          <PostRow key={post.id} post={post} index={index} />
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}
            </>
          )}
        </main>

        <Footer />
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" will be removed for good, including from the Community Blog if it's published.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeletePost();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Blogs;
