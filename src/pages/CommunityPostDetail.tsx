import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, BadgeCheck, Heart, Maximize2, MessageCircle, Pencil, Share2, Trash2 } from "lucide-react";

import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EditPostModal } from "@/components/community-posts/EditPostModal";
import { ImageLightbox } from "@/components/community-posts/ImageLightbox";
import { InlineComments } from "@/components/community-posts/InlineComments";
import { PostImageGallery } from "@/components/community-posts/PostImageGallery";
import { LinkifiedText } from "@/components/common/LinkifiedText";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  AwaitingReplyBadge,
  PostStatusBadge,
  PostTypeBadge,
} from "@/components/community-posts/PostTypeBadge";
import { useAuth } from "@/context/AuthContext";
import { getBreadcrumbSchema } from "@/lib/structured-data";

import { PRIMARY_DOMAIN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { formatRelativeTime } from "@/utils/date-utils";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import {
  POST_STATUSES,
  deleteCommunityPost,
  getCommunityPostById,
  isAwaitingReply,
  togglePostLike,
  updateCommunityPost,
  getPostImageUrls,
  type CommunityPost,
} from "@/integrations/supabase/services/community-posts";

const CommunityPostDetail = () => {
  const { id: postId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const loadPost = useCallback(async () => {
    if (!postId) return;

    setLoading(true);
    const { data, error } = await getCommunityPostById(postId);

    if (error || !data) {
      toast.error("This post is no longer available");
      navigate("/posts", { replace: true });
    } else {
      setPost(data);
    }
    setLoading(false);
  }, [postId, navigate]);

  useEffect(() => {
    if (postId) {
      navigate(`/posts#post-${postId}`, { replace: true });
    } else {
      navigate("/posts", { replace: true });
    }
  }, [postId, navigate]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }
    if (!post) return;

    const { error, liked } = await togglePostLike(post.id);
    if (error) {
      toast.error("Could not update like");
      return;
    }

    setPost({
      ...post,
      viewer_has_liked: liked,
      likes_count: Math.max(0, post.likes_count + (liked ? 1 : -1)),
    });
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share && post) {
      try {
        await navigator.share({ title: post.title, url });
        return;
      } catch {
        // Share sheet dismissed — fall through to clipboard.
      }
    }

    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  /** Message the author — available for every author now, not only mentors. */
  const handleContact = async () => {
    if (!user) {
      toast.error("Sign in to message the author");
      return;
    }
    if (!post) return;

    const { data: conversation, error } = await getOrCreateConversation(user.id, post.author.id);
    if (error || !conversation) {
      toast.error("Could not start conversation");
      return;
    }

    navigate(`/messages/${conversation.id}`);
  };

  const handleStatusChange = async (status: string) => {
    if (!post) return;

    const { error } = await updateCommunityPost(post.id, { status });
    if (error) {
      toast.error("Could not update status");
      return;
    }

    setPost({ ...post, status });
    toast.success(`Marked as ${status}`);
  };

  const handleDelete = async () => {
    if (!post) return;

    const { error } = await deleteCommunityPost(post.id);
    if (error) {
      toast.error("Could not delete post");
      return;
    }

    toast.success("Post deleted");
    navigate("/posts", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl space-y-4 px-4 py-8">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardHeader className="flex-row items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const canonical = `${PRIMARY_DOMAIN}/posts/${post.id}`;

  return (
    <>
      <SEOHead
        title={`${post.title} | Posts | Friendly Learning SRMAP`}
        description={post.content.slice(0, 160)}
        canonical={canonical}
      />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Posts", url: `${PRIMARY_DOMAIN}/posts` },
          { name: post.title, url: canonical },
        ])}
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 pt-8 pb-10">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 mb-6 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate("/posts");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to posts
          </Button>

          <Card className="relative overflow-hidden">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Author — larger, more prominent on the detail page */}
                <div className="flex items-center gap-4">
                  <Avatar
                    className={cn(
                      "h-14 w-14 shrink-0 border transition-colors duration-150",
                      post.author.is_mentor && "cursor-pointer hover:border-foreground/30",
                    )}
                    onClick={() => {
                      if (post.author.is_mentor) navigate(`/mentor/${post.author.id}`);
                    }}
                  >
                    <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
                    <AvatarFallback className="bg-secondary text-lg font-medium text-secondary-foreground">
                      {getInitials(post.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2
                        className={cn(
                          "text-base font-semibold leading-tight",
                          post.author.is_mentor && "cursor-pointer hover:text-primary hover:underline transition-colors",
                        )}
                        onClick={() => {
                          if (post.author.is_mentor) navigate(`/mentor/${post.author.id}`);
                        }}
                      >
                        {post.author.name}
                      </h2>
                      {post.author.is_mentor && (
                        <BadgeCheck
                          className="h-4 w-4 text-primary cursor-pointer"
                          aria-label="Verified mentor"
                          onClick={() => navigate(`/mentor/${post.author.id}`)}
                        />
                      )}
                    </div>
                    {post.author.department && (
                      <p className="text-sm text-muted-foreground">{post.author.department}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(post.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <PostTypeBadge type={post.post_type} />
                  <PostStatusBadge status={post.status} />
                  {isAwaitingReply(post) && <AwaitingReplyBadge />}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <h1 className="mb-3 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">{post.title}</h1>
                {/* Capped at ~65 characters a line, same reasoning as PostCard.
                    This is the page where someone reads the whole thing, so it
                    matters more here than in the feed. */}
                <div className="w-full whitespace-pre-line leading-relaxed text-muted-foreground">
                  <LinkifiedText text={post.content} />
                </div>
              </div>

              {/* LinkedIn-style Multi-Image Gallery */}
              <PostImageGallery
                images={getPostImageUrls(post.image_url)}
                title={post.title}
                onImageClick={(src, index) => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
              />

              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal text-muted-foreground">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  aria-pressed={post.viewer_has_liked}
                  className={cn("gap-1.5", post.viewer_has_liked && "text-rose-600 dark:text-rose-400")}
                >
                  <Heart className={cn("h-4 w-4", post.viewer_has_liked && "fill-current")} />
                  <span className="tabular">{post.likes_count}</span>
                </Button>

                <span className="flex items-center gap-1.5 px-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  <span className="tabular">{post.comments_count}</span>
                  <span className="sr-only">replies</span>
                </span>

                <Button variant="ghost" size="sm" onClick={handleShare} className="gap-1.5">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>

                {!post.viewer_is_author && (
                  <Button size="sm" onClick={handleContact} className="ml-auto">
                    Message {post.author.name.split(" ")[0]}
                  </Button>
                )}
              </div>

              {/* Author controls. Letting an author close a filled request is what
                  keeps the board from silting up with stale asks. */}
              {post.viewer_is_author && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-secondary/50 p-3">
                  <span className="mr-1 text-sm font-medium">Your post</span>
                  <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  {POST_STATUSES.map((status) => (
                    <Button
                      key={status.value}
                      size="sm"
                      variant={post.status === status.value ? "default" : "outline"}
                      aria-pressed={post.status === status.value}
                      onClick={() => handleStatusChange(status.value)}
                    >
                      {status.label}
                    </Button>
                  ))}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{post.title}" and its replies will be permanently removed. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete post
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardContent className="pt-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
                Replies
                {post.comments_count > 0 && (
                  <span className="tabular text-sm font-normal text-muted-foreground">{post.comments_count}</span>
                )}
              </h2>
              <InlineComments
                postId={post.id}
                onCommentAdded={() =>
                  setPost((current) =>
                    current ? { ...current, comments_count: current.comments_count + 1 } : current,
                  )
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {post.viewer_is_author && (
        <EditPostModal
          post={post}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onPostUpdated={(updated) => {
            setPost(updated);
            setShowEditModal(false);
          }}
        />
      )}

      <ImageLightbox
        images={lightboxOpen ? getPostImageUrls(post.image_url) : []}
        initialIndex={lightboxIndex}
        title={post.title}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default CommunityPostDetail;
