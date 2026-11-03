import { useEffect, useMemo, useState } from "react";
import NoIndex from "@/components/NoIndex";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, Check, Eye, EyeOff, FileX, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { CampusBrainIcon } from "@/components/icons/CampusBrainIcon";
import { ARTICLE_PROSE, coverImageOf, readingMinutes } from "@/components/blog/article-prose";
import { cn } from "@/lib/utils";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/context/AuthContext";
import { useBlogPost } from "@/hooks/useBlogPosts";
import { getInitials } from "@/utils/user-utils";
import { deleteBlogPost, incrementBlogPostViews } from "@/integrations/supabase/services/blog-posts";

const BlogPostDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { post, loading } = useBlogPost(slug);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    if (post?.is_published && post.slug) {
      incrementBlogPostViews(post.slug);
    }
  }, [post?.id]);

  const canManage = post && user && (user.id === post.author_id || isAdmin);

  const readingTimeMinutes = useMemo(() => readingMinutes(post?.content_text), [post?.content_text]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.title,
          text: post?.excerpt || undefined,
          url,
        });
        return;
      } catch (err) {
        // Fallback to clipboard below
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    setDeleting(true);
    try {
      await deleteBlogPost(post.id);
      toast.success("Post deleted");
      navigate("/blogs");
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't delete the post. Try again."));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-16 pt-24 sm:px-6" aria-busy="true" aria-label="Loading post">
          <Skeleton className="mb-10 h-5 w-32" />
          <Skeleton className="mb-3 h-11 w-full" />
          <Skeleton className="mb-6 h-11 w-3/4" />
          <Skeleton className="mb-8 h-6 w-5/6" />
          <div className="mb-8 flex items-center gap-3 border-y border-border py-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <NoIndex />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-16 pt-32 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <FileX className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Post not found</h1>
          <p className="mt-2 text-muted-foreground">
            It may have been unpublished or deleted, or the link has a typo.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/blogs">Browse the Community Blog</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Home</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const shareUrl = `${PRIMARY_DOMAIN}/blogs/${post.slug}`;
  const safeHtml = sanitizeBlogHtml(post.content_html);
  const publishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const coverImage = coverImageOf(post.cover_image_url);
  const authorName = post.author_name ?? "SRM AP student";
  // Posts published without a subtitle store their opening lines as the
  // excerpt; showing that above the body would print the same text twice.
  const squash = (text: string) => text.replace(/\s+/g, " ").trim();
  const excerptStem = squash(post.excerpt ?? "").replace(/\.{3}$/, "");
  const subtitle = excerptStem && !squash(post.content_text).startsWith(excerptStem) ? post.excerpt : null;

  return (
    <>
      <SEOHead
        title={`${post.title} | Community Blog`}
        description={post.excerpt || post.content_text.slice(0, 155).trim() || `${post.title} — a community blog post on Friendly Learning SRMAP.`}
        canonical={shareUrl}
        ogImage={coverImage ?? undefined}
        ogType="article"
      />

      {/* Reading progress: tracks scroll position, so it moves only when the reader does. */}
      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-50 h-0.5 origin-left bg-primary"
        style={{ scaleX }}
      />

      <div className="flex min-h-screen flex-col bg-background">
        <div className="mx-auto w-full max-w-[680px] flex-1 px-4 pb-20 pt-20 sm:px-6 sm:pt-24">
          <nav className="mb-10 flex items-center justify-between gap-3">
            <Link
              to="/blogs"
              className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Community Blog
            </Link>

            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-9 gap-1.5" onClick={handleShare} aria-label="Share this post">
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
              </Button>

              {canManage && (
                <>
                  <Button asChild size="sm" variant="ghost" className="h-9 gap-1.5">
                    <Link to={`/blogs/${post.slug}/edit`}>
                      <Pencil className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </Link>
                  </Button>
                  <span aria-hidden className="mx-1 h-5 w-px bg-border" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 gap-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </>
              )}
            </div>
          </nav>

          {!post.is_published && (
            <div className="mb-8 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Draft. Only you and admins can see this post until it is published.</span>
            </div>
          )}

          <article className="animate-fade-up">
            <header className="flex flex-col gap-5">
              {post.tags[0] && (
                <p className="text-sm font-medium text-primary">{post.tags[0]}</p>
              )}
              <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-foreground md:text-5xl">
                {post.title}
              </h1>
              {subtitle && <p className="text-xl leading-relaxed text-muted-foreground">{subtitle}</p>}

              <div className="mt-2 flex items-center justify-between gap-4 border-y border-border py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author_image ?? undefined} alt="" />
                    <AvatarFallback className="text-xs font-medium">{getInitials(authorName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col text-sm">
                    <span className="truncate font-medium text-foreground">{authorName}</span>
                    <span className="text-muted-foreground tabular">
                      {publishedDate && (
                        <time dateTime={post.published_at ?? undefined}>{publishedDate}</time>
                      )}
                      {publishedDate && " · "}
                      {readingTimeMinutes} min read
                    </span>
                  </div>
                </div>

                {post.view_count > 0 && (
                  <span className="flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground tabular">
                    <Eye className="h-4 w-4" aria-hidden />
                    {post.view_count.toLocaleString("en-IN")}
                    <span className="sr-only">views</span>
                  </span>
                )}
              </div>
            </header>

            {coverImage && (
              <figure className="my-10 overflow-hidden rounded-lg border border-border bg-muted md:-mx-12">
                <img src={coverImage} alt="" className="aspect-[16/9] w-full object-cover" />
              </figure>
            )}

            <div className={cn(ARTICLE_PROSE, coverImage ? "mt-0" : "mt-10", "flow-root")} dangerouslySetInnerHTML={{ __html: safeHtml }} />

            {post.tags.length > 0 && (
              <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
                {post.tags.map((tag) => (
                  <li key={tag}>
                    <span className="inline-flex rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                      {tag}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <aside className="mt-12 flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CampusBrainIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Questions about this topic?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    CampusBrain can point you to related courses, faculty and resources at SRM AP.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="h-9 shrink-0">
                <Link to={`/search?q=${encodeURIComponent(`Tell me about "${post.title}"`)}`}>Ask CampusBrain</Link>
              </Button>
            </aside>
          </article>
        </div>

        <Footer />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>
              "{post.title}" will be removed from the Community Blog. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default BlogPostDetail;
