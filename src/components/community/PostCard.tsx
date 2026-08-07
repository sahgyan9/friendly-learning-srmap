import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heart, MessageCircle, Share2, BadgeCheck, ChevronDown, ArrowRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { formatRelativeTime } from "@/utils/date-utils";
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
  /** Only ever called for the viewer's own posts — the menu that offers it is gated on `post.viewer_is_author`. */
  onEdit?: (post: CommunityPost) => void;
  onDelete?: (post: CommunityPost) => void;
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
  achievement:      "emerald",
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
  onEdit,
  onDelete,
  variant = "full",
  className,
}: PostCardProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const isCompact = variant === "compact";
  const postedAt = formatRelativeTime(post.created_at);
  const accentGradient = POST_TYPE_GRADIENT[post.post_type] ?? "muted";

  const handleAuthorClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onAuthorClick) {
      onAuthorClick(post.author.id, event);
    } else if (post.author.is_mentor) {
      navigate(`/mentor/${post.author.id}`);
    }
  };

  /**
   * On the homepage rail every card is stretched to the height of the tallest,
   * which is set by whichever card carries an image. A text-only post clamped
   * to two lines then leaves that height as a blank column — the ragged, empty
   * look that makes text posts read as second-class next to image posts.
   *
   * So a compact card with no image spends the space on its own content
   * instead: the text block grows to fill and the excerpt clamps at six lines
   * rather than two. Same footprint, no void, and the post that had no picture
   * gets to say more rather than less.
   */
  const images = getPostImageUrls(post.image_url);
  const isCompactTextOnly = isCompact && images.length === 0;
  const hasGroupLink = /\/communities\/[^\s<]+/i.test(post.content);
  const isLongText = post.content.length > 180 || (post.content.match(/\n/g) || []).length >= 3;

  const handleCardClick = () => {
    if (isCompact) {
      if (onOpen) {
        onOpen(post.id);
      } else {
        navigate(`/community-posts#post-${post.id}`);
      }
    } else if (isLongText && !hasGroupLink) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all duration-300 select-text",
        (isCompact || isLongText) && "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:border-emerald-500/30",
        className,
      )}
      onClick={handleCardClick}
    >
      {/* Solid full-width top accent border — colour tracks the post type */}
      <CardAccentBorder gradient={accentGradient} />

      {/* Hover glow — Posts brand colour (emerald) */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-emerald-500/4 to-transparent" />

      {/* ── Body ── */}
      <div className={cn("relative flex flex-1 flex-col gap-3 px-4", isCompact ? "py-4" : "py-5")}>

        {/* ── Top Header: Author details & Post Type Badges ── */}
        <div className="flex items-start justify-between gap-3">
          {/* Author avatar & info */}
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              className="h-9 w-9 shrink-0 ring-1 ring-border/80 transition-all duration-200 cursor-pointer hover:ring-2 hover:ring-emerald-500/60 hover:scale-105"
              onClick={handleAuthorClick}
            >
              <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
              <AvatarFallback className="bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                {getInitials(post.author.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 leading-tight text-left">
              <div className="flex items-center gap-1">
                <span
                  className="truncate text-xs font-semibold text-foreground text-left cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors"
                  onClick={handleAuthorClick}
                >
                  {post.author.name}
                </span>
                {post.author.is_mentor && (
                  <BadgeCheck
                    className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 cursor-pointer"
                    aria-label="Verified mentor"
                    onClick={handleAuthorClick}
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {post.author.department && (
                  <>
                    <span className="truncate max-w-[120px]">{post.author.department}</span>
                    <span>•</span>
                  </>
                )}
                <span className="shrink-0">{postedAt}</span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            <PostTypeBadge type={post.post_type} />
            <PostStatusBadge status={post.status} />
            {isAwaitingReply(post) && <AwaitingReplyBadge />}

            {post.viewer_is_author && (onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Post options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(post)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => onDelete(post)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Title + content */}
        <div className={cn("space-y-1.5 text-left", isCompactTextOnly && "flex-1")}>
          <h3
            className={cn(
              "font-semibold leading-snug tracking-tight text-left text-foreground",
              isCompact ? "line-clamp-2 text-base" : "text-xl",
              "group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-200",
            )}
          >
            {post.title}
          </h3>

          <div
            className={cn(
              "whitespace-pre-line text-sm leading-relaxed text-muted-foreground text-left transition-all duration-300 w-full",
              !isExpanded && !isCompact && !hasGroupLink && "line-clamp-4",
              !isExpanded && isCompact && !hasGroupLink && (isCompactTextOnly ? "line-clamp-6" : "line-clamp-2"),
              isExpanded && "line-clamp-none",
            )}
          >
            <LinkifiedText text={post.content} />
          </div>

          {isLongText && !hasGroupLink && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isCompact) {
                  if (onOpen) {
                    onOpen(post.id);
                  } else {
                    navigate(`/community-posts#post-${post.id}`);
                  }
                } else {
                  setIsExpanded((prev) => !prev);
                }
              }}
              className="mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all duration-200 focus:outline-none"
            >
              <span>{isCompact ? "📖 Read full post" : isExpanded ? "📖 Show less" : "📖 Read full post"}</span>
              {isCompact ? (
                <ArrowRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", isExpanded && "rotate-180")}
                />
              )}
            </button>
          )}
        </div>

        {/* LinkedIn-style Multi-Image Auto Gallery */}
        <PostImageGallery
          images={images}
          title={post.title}
          variant={variant}
          onImageClick={(src, index) => {
            onImageClick?.(src, post.title, index, images);
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

      {/* ── Footer — strictly action buttons ── */}
      <div
        className="relative flex items-center justify-between gap-1 border-t border-border/60 px-4 py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-rose-600 transition-all duration-200 hover:scale-105",
                post.viewer_has_liked && "text-rose-600 dark:text-rose-400 font-semibold",
              )}
              onClick={onLike ? (event) => onLike(post.id, event) : undefined}
              aria-pressed={post.viewer_has_liked}
              aria-label={post.viewer_has_liked ? "Unlike post" : "Like post"}
            >
              <Heart className={cn("h-4 w-4 transition-transform", post.viewer_has_liked && "fill-current scale-110")} />
              <span>{post.likes_count > 0 ? post.likes_count : "Like"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1 text-xs font-medium">
            {post.viewer_has_liked ? "💖 Liked" : "❤️ Like"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 hover:scale-105"
              onClick={(event) => {
                event.stopPropagation();
                onComment?.(post.id, event);
              }}
              aria-label="Comments"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.comments_count > 0 ? `${post.comments_count} Comment${post.comments_count > 1 ? "s" : ""}` : "Comment"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1 text-xs font-medium">
            💬 {post.comments_count > 0 ? `${post.comments_count} Comments` : "Write a comment"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs font-medium text-muted-foreground hover:text-primary transition-all duration-200 hover:scale-105"
              onClick={onShare ? (event) => onShare(post, event) : undefined}
              aria-label="Share post"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1 text-xs font-medium">
            🔗 Share link
          </TooltipContent>
        </Tooltip>
      </div>
    </Card>
  );
}

export default PostCard;
