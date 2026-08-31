import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/context/AuthContext";
import { useBlogPost } from "@/hooks/useBlogPosts";
import { deleteBlogPost, incrementBlogPostViews } from "@/integrations/supabase/services/blog-posts";

const getInitials = (name: string) =>
  name.split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const BlogPostDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { post, loading } = useBlogPost(slug);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Top Reading Progress Bar
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

  const readingTimeMinutes = useMemo(() => {
    if (!post?.content_text) return 1;
    const words = post.content_text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [post?.content_text]);

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
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      toast.error("Failed to copy link");
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
      toast.error(getErrorMessage(error, "Failed to delete post"));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-4xl px-4 pb-16 pt-24 flex-1">
          <Skeleton className="h-4 w-28 mb-6" />
          <Skeleton className="h-64 w-full mb-8 rounded-2xl" />
          <Skeleton className="h-10 w-4/5 mb-4" />
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-2xl px-4 pb-16 pt-32 flex-1 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Story Not Found</h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            This post may have been removed, unpublished, or the link is incorrect.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/blogs">Browse Community Stories</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
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

  const isGradient = post.cover_image_url?.startsWith("gradient:") ?? false;
  const gradientStyle = isGradient ? post.cover_image_url?.replace("gradient:", "") : null;

  return (
    <>
      <SEOHead
        title={`${post.title} | Community Blog`}
        description={post.excerpt || post.content_text.slice(0, 155).trim() || `${post.title} — a community blog post on Friendly Learning SRMAP.`}
        canonical={shareUrl}
        ogImage={!isGradient ? post.cover_image_url ?? undefined : undefined}
        ogType="article"
      />

      {/* Fixed Reading Progress Bar at Top */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
        style={{ scaleX }}
      />

      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 w-full container mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-16">
          {/* Top Bar Actions */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <Link
              to="/blogs"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1 px-2.5 rounded-lg hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Community Blog
            </Link>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={handleShare}
                title="Share this story"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{copied ? "Copied" : "Share"}</span>
              </Button>

              {canManage && (
                <>
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                    <Link to={`/blogs/${post.slug}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {!post.is_published && (
            <Badge variant="outline" className="mb-6 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Unpublished Draft — only you and admins can see this
            </Badge>
          )}

          {/* Article Container */}
          <article className="space-y-8">
            {/* Cover Banner */}
            {post.cover_image_url && (
              <div className="w-full h-56 sm:h-80 md:h-96 rounded-2xl overflow-hidden border border-border/60 shadow-sm">
                {isGradient ? (
                  <div className="w-full h-full" style={{ background: gradientStyle || "" }} />
                ) : (
                  <img
                    src={post.cover_image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-normal text-xs px-3 py-1 bg-secondary/80">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Article Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              {post.title}
            </h1>

            {/* Author Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-t border-border/80 py-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-border">
                  <AvatarImage src={post.author_image ?? undefined} alt="" />
                  <AvatarFallback className="font-semibold text-xs">
                    {getInitials(post.author_name ?? "Student")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {post.author_name ?? "SRMAP Student"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {publishedDate && <span>{publishedDate}</span>}
                    <span>·</span>
                    <span>{readingTimeMinutes} min read</span>
                  </div>
                </div>
              </div>

              {post.view_count > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
                  <Eye className="h-3.5 w-3.5" />
                  <span>{post.view_count} views</span>
                </div>
              )}
            </div>

            {/* Article Content */}
            <div
              className="prose prose-base sm:prose-lg dark:prose-invert max-w-none pt-2 leading-relaxed prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:underline-offset-4 prose-blockquote:border-l-4 prose-blockquote:border-primary/60 prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-5 prose-blockquote:rounded-r-xl prose-img:rounded-2xl"
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />

            {/* Ask AI Footer */}
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-6">
              <div>
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Have questions about this story or topic?
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask CampusBrain AI to explore related concepts, courses, or faculty mentors at SRM AP.
                </p>
              </div>
              <Button asChild size="sm" className="shadow-xs shrink-0">
                <Link to={`/search?q=${encodeURIComponent(`Tell me about "${post.title}"`)}`}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Ask AI
                </Link>
              </Button>
            </div>
          </article>
        </div>

        <Footer />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this story?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The story will be permanently removed from the Community Blog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlogPostDetail;
