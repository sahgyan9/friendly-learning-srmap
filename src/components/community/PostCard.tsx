import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import type { CommunityPost } from "@/integrations/supabase/services/community-posts";
import { PostStatusBadge, PostTypeBadge } from "./PostTypeBadge";

interface PostCardProps {
  post: CommunityPost;
  onOpen?: (postId: string) => void;
  onLike?: (postId: string, event: React.MouseEvent) => void;
  onShare?: (post: CommunityPost, event: React.MouseEvent) => void;
  onComment?: (postId: string, event: React.MouseEvent) => void;
  onAuthorClick?: (authorId: string, event: React.MouseEvent) => void;
  /** `compact` is the homepage carousel; `full` is the /community-posts feed. */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * The single source of truth for how a community post looks. The homepage
 * carousel, the feed page and the detail page all previously carried their own
 * near-identical copy of this markup, which is why they drifted apart.
 */
export function PostCard({
  post,
  onOpen,
  onLike,
  onShare,
  onComment,
  onAuthorClick,
  variant = "full",
  className,
}: PostCardProps) {
  const isCompact = variant === "compact";

  return (
    <Card
      className={cn(
        "flex flex-col transition-shadow",
        onOpen && "cursor-pointer hover:shadow-md",
        className,
      )}
      onClick={onOpen ? () => onOpen(post.id) : undefined}
    >
      <CardHeader className="gap-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              className={cn("h-10 w-10 shrink-0", onAuthorClick && "cursor-pointer")}
              onClick={onAuthorClick ? (event) => onAuthorClick(post.author.id, event) : undefined}
            >
              <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn("truncate font-semibold", onAuthorClick && "cursor-pointer hover:text-primary")}
                  onClick={onAuthorClick ? (event) => onAuthorClick(post.author.id, event) : undefined}
                >
                  {post.author.name}
                </span>
                {post.author.is_mentor && (
                  <BadgeCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Verified mentor" />
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {[post.author.department, formatDistanceToNow(new Date(post.created_at), { addSuffix: true })]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1">
            <PostTypeBadge type={post.post_type} />
            <PostStatusBadge status={post.status} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pb-3">
        <h3 className={cn("font-semibold leading-snug", isCompact ? "text-base line-clamp-2" : "text-lg")}>
          {post.title}
        </h3>

        <p
          className={cn(
            "whitespace-pre-line text-sm text-muted-foreground",
            isCompact ? "line-clamp-3" : "line-clamp-5",
          )}
        >
          {post.content}
        </p>

        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className="max-h-64 w-full rounded-md border object-cover"
          />
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, isCompact ? 3 : 8).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal">
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="mt-auto gap-1 border-t pt-3">
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5", post.viewer_has_liked && "text-rose-600 dark:text-rose-400")}
          onClick={onLike ? (event) => onLike(post.id, event) : undefined}
          aria-pressed={post.viewer_has_liked}
          aria-label={post.viewer_has_liked ? "Unlike post" : "Like post"}
        >
          <Heart className={cn("h-4 w-4", post.viewer_has_liked && "fill-current")} />
          {post.likes_count}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onComment ? (event) => onComment(post.id, event) : undefined}
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments_count}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto gap-1.5"
          onClick={onShare ? (event) => onShare(post, event) : undefined}
          aria-label="Share post"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default PostCard;
