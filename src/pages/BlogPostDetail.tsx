import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Pencil, Sparkles, Trash2 } from "lucide-react";
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

/**
 * Public reader for a blog_posts entry. content_html is sanitized again here,
 * immediately before dangerouslySetInnerHTML, even though it was already
 * sanitized on write — this is the render boundary that actually protects
 * other readers regardless of how a row got into the table. See
 * src/lib/sanitize-html.ts and the blog_posts migration's header comment.
 */
const BlogPostDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { post, loading } = useBlogPost(slug);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (post?.is_published && post.slug) {
      incrementBlogPostViews(post.slug);
    }
    // Only once per mount of a given published post.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.id]);

  const canManage = post && user && (user.id === post.author_id || isAdmin);

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
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-24 flex-1">
          <Skeleton className="h-4 w-28 mb-6" />
          <div className="rounded-xl border bg-card p-6 sm:p-8">
            <Skeleton className="h-8 w-4/5 mb-6" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-28 flex-1 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <BookOpen className="h-7 w-7 text-muted-foreground" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Post not found</h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            This post may have been removed, unpublished, or the link may be invalid.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/blogs">Browse the Community Blog</Link>
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
    ? new Date(post.published_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <>
      <SEOHead
        title={`${post.title} | Community Blog`}
        description={post.excerpt || post.content_text.slice(0, 155).trim() || `${post.title} — a community blog post on Friendly Learning SRMAP.`}
        canonical={shareUrl}
        ogImage={post.cover_image_url ?? undefined}
        ogType="article"
      />

      <div className="min-h-screen bg-background flex flex-col">
        <div className="container mx-auto max-w-3xl px-4 pb-16 pt-24 flex-1">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/blogs"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Community Blog
            </Link>

            {canManage && (
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/blogs/${post.slug}/edit`}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Link>
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {!post.is_published && (
            <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Unpublished Draft — only you (and admins) can see this
            </Badge>
          )}

          <Card className="overflow-hidden p-0">
            {post.cover_image_url && (
              <img src={post.cover_image_url} alt="" className="aspect-video w-full object-cover" />
            )}
            <div className="p-6 sm:p-8">
              {post.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight text-foreground">
                {post.title}
              </h1>

              <div className="mt-4 flex items-center gap-2.5 border-b border-border pb-6 text-sm text-muted-foreground">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={post.author_image ?? undefined} alt="" />
                  <AvatarFallback>{getInitials(post.author_name ?? "Student")}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-foreground">{post.author_name ?? "Student"}</p>
                  {publishedDate && <p>{publishedDate}</p>}
                </div>
              </div>

              <div
                className="prose prose-sm sm:prose-base dark:prose-invert max-w-none mt-6 prose-headings:font-semibold prose-a:text-primary"
                dangerouslySetInnerHTML={{ __html: safeHtml }}
              />

              <div className="mt-8 flex items-center justify-end border-t border-border pt-4">
                <Button asChild size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
                  <Link to={`/search?q=${encodeURIComponent(`Tell me about "${post.title}"`)}`}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
                    Ask AI about this
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <Footer />
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone. The post will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BlogPostDetail;
