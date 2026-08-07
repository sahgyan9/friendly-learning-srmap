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
import { EditPostModal } from "@/components/community/EditPostModal";
import { ImageLightbox } from "@/components/community/ImageLightbox";
import { InlineComments } from "@/components/community/InlineComments";
import { PostImageGallery } from "@/components/community/PostImageGallery";
import { LinkifiedText } from "@/components/common/LinkifiedText";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import {
  AwaitingReplyBadge,
  PostStatusBadge,
  PostTypeBadge,
} from "@/components/community/PostTypeBadge";
import { useAuth } from "@/context/AuthContext";
import { getBreadcrumbSchema } from "@/lib/structured-data";

/** Maps post_type directly to a CardAccentBorder gradient key. */
const POST_TYPE_GRADIENT: Record<string, string> = {
  hackathon: "amber",
  "study-help": "sky",
  project: "violet",
  research: "emerald",
  "problem-solving": "rose",
  achievement: "emerald",
  announcement: "orange",
  general: "muted",
};
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
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
      navigate("/community-posts", { replace: true });
    } else {
      setPost(data);
    }
    setLoading(false);
  }, [postId, navigate]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleLike = async () => {
    if (!user) {
      toast.error("Sign in to like posts");
      return;
    }
    if (!post) return;

    const { error, liked } = await togglePostLike(post.id);
    if (error) {
      toast.error("Failed to update like");
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
    toast.success("Link copied to clipboard");
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
      toast.error("Failed to start conversation");
      return;
    }

    navigate(`/messages?chat=${conversation.id}`);
  };

  const handleStatusChange = async (status: string) => {
    if (!post) return;

    const { error } = await updateCommunityPost(post.id, { status });
    if (error) {
      toast.error("Failed to update status");
      return;
    }

    setPost({ ...post, status });
    toast.success(status === "fulfilled" ? "Marked as fulfilled 🎉" : `Marked as ${status}`);
  };

  const handleDelete = async () => {
    if (!post) return;

    const { error } = await deleteCommunityPost(post.id);
    if (error) {
      toast.error("Failed to delete post");
      return;
    }

    toast.success("Post deleted");
    navigate("/community-posts", { replace: true });
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

  const canonical = `${PRIMARY_DOMAIN}/community-posts/${post.id}`;

  return (
    <>
      <SEOHead
        title={`${post.title} | Community Posts`}
        description={post.content.slice(0, 160)}
        canonical={canonical}
      />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Posts", url: `${PRIMARY_DOMAIN}/community-posts` },
          { name: post.title, url: canonical },
        ])}
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 pt-28 pb-10">
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 gap-1.5 text-muted-foreground hover:text-foreground">
            <Link to="/community-posts">
              <ArrowLeft className="h-4 w-4" />
              Back to posts
            </Link>
          </Button>

          <Card className="relative overflow-hidden">
            {/* Accent border colour tracks the post type — same as the feed cards */}
            <CardAccentBorder gradient={(POST_TYPE_GRADIENT[post.post_type] ?? 'muted') as any} />
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Author — larger, more prominent on the detail page */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20 shrink-0">
                    <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
                    <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                      {getInitials(post.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-lg font-semibold leading-tight">{post.author.name}</h2>
                      {post.author.is_mentor && (
                        <BadgeCheck className="h-4 w-4 text-primary" aria-label="Verified mentor" />
                      )}
                    </div>
                    {post.author.department && (
                      <p className="text-sm text-muted-foreground">{post.author.department}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
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
                <h1 className="mb-3 text-2xl font-bold leading-tight">{post.title}</h1>
                {/* Capped at ~65 characters a line, same reasoning as PostCard.
                    This is the page where someone reads the whole thing, so it
                    matters more here than in the feed. */}
                <p className="max-w-prose whitespace-pre-line leading-relaxed text-muted-foreground">
                  <LinkifiedText text={post.content} />
                </p>
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
                    <Badge key={tag} variant="outline" className="font-normal">
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
                  {post.likes_count}
                </Button>

                <span className="flex items-center gap-1.5 px-2 text-sm text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {post.comments_count}
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
                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
                  <span className="mr-1 text-sm font-medium">Your post:</span>
                  <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {POST_STATUSES.map((status) => (
                    <Button
                      key={status.value}
                      size="sm"
                      variant={post.status === status.value ? "default" : "outline"}
                      onClick={() => handleStatusChange(status.value)}
                    >
                      {status.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto gap-1.5 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
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
                  <span className="text-sm font-normal text-muted-foreground">({post.comments_count})</span>
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
