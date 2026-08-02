import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, BadgeCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import type { CommunityPost } from "@/integrations/supabase/services/community-posts";
import { PostStatusBadge, PostTypeBadge, postTypeAccent } from "./PostTypeBadge";

interface PostCardProps {
  post: CommunityPost;
  onOpen?: (postId: string) => void;
  onLike?: (postId: string, event: React.MouseEvent) => void;
  onShare?: (post: CommunityPost, event: React.MouseEvent) => void;
  onComment?: (postId: string, event: React.MouseEvent) => void;
  onAuthorClick?: (authorId: string, event: React.MouseEvent) => void;
  /** `compact` is the homepage rail; `full` is the /community-posts feed. */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * The single source of truth for how a community post looks.
 *
 * The ask leads and the author follows as a byline. An earlier version opened
 * with the avatar and name like a social feed, which buried the one line a
 * student is actually scanning for — what is being asked.
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
  const postedAt = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all",
        onOpen && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
      onClick={onOpen ? () => onOpen(post.id) : undefined}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", postTypeAccent(post.post_type))}
      />

      <div className={cn("flex flex-1 flex-col gap-3 pl-5 pr-4", isCompact ? "py-4" : "py-5")}>
        <div className="flex flex-wrap items-center gap-2">
          <PostTypeBadge type={post.post_type} />
          <PostStatusBadge status={post.status} />
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{postedAt}</span>
        </div>

        <div className="space-y-1.5">
          <h3
            className={cn(
              "font-semibold leading-snug tracking-tight",
              isCompact ? "line-clamp-2 text-base" : "text-xl",
              onOpen && "group-hover:text-primary",
            )}
          >
            {post.title}
          </h3>

          {/* max-w-prose caps the line at about 65 characters. The card is
              ~700px wide, which at this size was running to nearly 100
              characters a line — past roughly 75 the eye starts missing the
              start of the next line on the return sweep, which is felt as
              "this is tiring" rather than noticed. The compact rail is already
              narrow and clamped to two lines, so it needs no help. */}
          <p
            className={cn(
              "whitespace-pre-line text-sm leading-relaxed text-muted-foreground",
              isCompact ? "line-clamp-2" : "line-clamp-4 max-w-prose",
            )}
          >
            {post.content}
          </p>
        </div>

        {/* `object-cover` with `max-h-72` was throwing most of the picture away.
            Measured on a real post: a 1024x1024 image rendered into a 696x286
            box, so the browser kept a horizontal strip and discarded 72% of it —
            a shared certificate lost its heading and its signatures.

            The cause is that `w-full` sets the width, the natural height then
            exceeds the cap, and `object-cover` resolves the mismatch by
            cropping. Sizing the image itself instead of a box for it means the
            aspect ratio survives: it shrinks until it fits both limits, and
            nothing is cut.

            The compact rail keeps `cover`. That one is a fixed-height thumbnail
            where a crop is the intended behaviour, not an accident. */}
        {post.image_url && (
          <img
            src={post.image_url}
            alt=""
            loading="lazy"
            className={cn(
              "rounded-lg border",
              isCompact
                ? "h-28 w-full object-cover"
                : "mx-auto h-auto max-h-[32rem] w-auto max-w-full",
            )}
          />
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, isCompact ? 2 : 6).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-normal text-muted-foreground">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Byline and actions share the last row: the author is context for the
            ask, not the headline, and the actions stay reachable without a
            separate bordered footer eating vertical space. */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar
              className={cn("h-7 w-7 shrink-0", onAuthorClick && "cursor-pointer")}
              onClick={onAuthorClick ? (event) => onAuthorClick(post.author.id, event) : undefined}
            >
              <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
              <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 leading-tight">
              <span className="flex items-center gap-1">
                <span
                  className={cn(
                    "truncate text-xs font-medium",
                    onAuthorClick && "cursor-pointer hover:text-primary",
                  )}
                  onClick={onAuthorClick ? (event) => onAuthorClick(post.author.id, event) : undefined}
                >
                  {post.author.name}
                </span>
                {post.author.is_mentor && (
                  <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verified mentor" />
                )}
              </span>
              {post.author.department && (
                <span className="block truncate text-[11px] text-muted-foreground">
                  {post.author.department}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-2 text-muted-foreground hover:text-rose-600",
                post.viewer_has_liked && "text-rose-600 dark:text-rose-400",
              )}
              onClick={onLike ? (event) => onLike(post.id, event) : undefined}
              aria-pressed={post.viewer_has_liked}
              aria-label={post.viewer_has_liked ? "Unlike post" : "Like post"}
            >
              <Heart className={cn("h-4 w-4", post.viewer_has_liked && "fill-current")} />
              {/* A row of zeroes makes a young board look abandoned; the count
                  appears once there is something to count. */}
              {post.likes_count > 0 && <span className="text-xs">{post.likes_count}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-primary"
              onClick={onComment ? (event) => onComment(post.id, event) : undefined}
              aria-label="Comments"
            >
              <MessageCircle className="h-4 w-4" />
              {post.comments_count > 0 && <span className="text-xs">{post.comments_count}</span>}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-primary"
              onClick={onShare ? (event) => onShare(post, event) : undefined}
              aria-label="Share post"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default PostCard;
