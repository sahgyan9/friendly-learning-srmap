import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, BadgeCheck, Maximize2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import type { CommunityPost } from "@/integrations/supabase/services/community-posts";
import { isAwaitingReply, getPostImageUrls } from "@/integrations/supabase/services/community-posts";
import { AwaitingReplyBadge, PostStatusBadge, PostTypeBadge } from "./PostTypeBadge";
import { LinkifiedText } from "@/components/common/LinkifiedText";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";
import { PostImageGallery } from "./PostImageGallery";

interface PostCardProps {
  post: CommunityPost;
  onOpen?: (postId: string) => void;
  onLike?: (postId: string, event: React.MouseEvent) => void;
  onShare?: (post: CommunityPost, event: React.MouseEvent) => void;
  onComment?: (postId: string, event: React.MouseEvent) => void;
  onAuthorClick?: (authorId: string, event: React.MouseEvent) => void;
  /** Opens the full-size view. Omitted on the compact rail, which has thumbnails. */
  onImageClick?: (src: string, title: string, index?: number, allImages?: string[]) => void;
  /** `compact` is the homepage rail; `full` is the /community-posts feed. */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Maps each post type to its CardAccentBorder gradient key.
 * Keeps the visual language consistent with PostTypeBadge's TYPE_ACCENTS.
 */
const POST_TYPE_GRADIENT: Record<string, string> = {
  hackathon:        "amber",
  "study-help":     "sky",
  project:          "violet",
  research:         "emerald",
  "problem-solving":"rose",
  achievement:      "amber",
  announcement:     "orange",
  general:          "muted",
};

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
  onImageClick,
  variant = "full",
  className,
}: PostCardProps) {
  const isCompact = variant === "compact";
  const postedAt = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
  const accentGradient = POST_TYPE_GRADIENT[post.post_type] ?? "muted";

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300",
        onOpen && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:border-emerald-500/30",
        className,
      )}
      onClick={onOpen ? () => onOpen(post.id) : undefined}
    >
      {/* Solid full-width top accent border — colour tracks the post type */}
      <CardAccentBorder gradient={accentGradient} />

      {/* Hover glow — Posts brand colour (emerald) */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-emerald-500/4 to-transparent" />

      {/* ── Body ── */}
      <div className={cn("relative flex flex-1 flex-col gap-3 px-4", isCompact ? "py-4" : "py-5")}>

        {/* Type + status badges row */}
        <div className="flex flex-wrap items-center gap-2">
          <PostTypeBadge type={post.post_type} />
          <PostStatusBadge status={post.status} />
          {isAwaitingReply(post) && <AwaitingReplyBadge />}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">{postedAt}</span>
        </div>

        {/* Title + content */}
        <div className="space-y-1.5">
          <h3
            className={cn(
              "font-semibold leading-snug tracking-tight",
              isCompact ? "line-clamp-2 text-base" : "text-xl",
              onOpen && "group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200",
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
            <LinkifiedText text={post.content} />
          </p>
        </div>

        {/* LinkedIn-style Multi-Image Auto Gallery */}
        <PostImageGallery
          images={getPostImageUrls(post.image_url)}
          title={post.title}
          variant={variant}
          onImageClick={(src, index) => {
            onImageClick?.(src, post.title, index, getPostImageUrls(post.image_url));
          }}
        />

        {/* Tags — emerald accent matching Posts brand colour */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, isCompact ? 2 : 6).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs font-normal bg-emerald-500/8 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15 transition-colors"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer — separated with border-t for breathing room ── */}
      <div className="relative flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
        {/* Author byline */}
        <div className="flex min-w-0 items-center gap-2">
          <Avatar
            className={cn(
              "h-7 w-7 shrink-0 ring-1 ring-border transition-all duration-200",
              onAuthorClick && "cursor-pointer hover:ring-emerald-500/40",
            )}
            onClick={onAuthorClick ? (event) => onAuthorClick(post.author.id, event) : undefined}
          >
            <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
            <AvatarFallback className="bg-emerald-500/10 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 leading-tight">
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "truncate text-xs font-medium",
                  onAuthorClick && "cursor-pointer hover:text-primary transition-colors",
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

        {/* Action buttons */}
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1.5 px-2 text-muted-foreground hover:text-rose-600 transition-colors",
              post.viewer_has_liked && "text-rose-600 dark:text-rose-400",
            )}
            onClick={onLike ? (event) => onLike(post.id, event) : undefined}
            aria-pressed={post.viewer_has_liked}
            aria-label={post.viewer_has_liked ? "Unlike post" : "Like post"}
          >
            <Heart className={cn("h-4 w-4", post.viewer_has_liked && "fill-current")} />
            {/* A row of zeroes makes a young board look abandoned; count
                appears once there is something to count. */}
            {post.likes_count > 0 && <span className="text-xs">{post.likes_count}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            onClick={onComment ? (event) => onComment(post.id, event) : undefined}
            aria-label="Comments"
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments_count > 0 && <span className="text-xs">{post.comments_count}</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-primary transition-colors"
            onClick={onShare ? (event) => onShare(post, event) : undefined}
            aria-label="Share post"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default PostCard;
