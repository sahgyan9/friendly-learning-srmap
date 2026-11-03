import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import {
  Heart,
  MessageCircle,
  Share2,
  BadgeCheck,
  ChevronDown,
  ArrowRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  User,
  HeartHandshake,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/utils/user-utils";
import { formatRelativeTime } from "@/utils/date-utils";
import type { CommunityPost } from "@/integrations/supabase/services/community-posts";
import {
  isAwaitingReply,
  getPostImageUrls,
  reportPeerConcern,
} from "@/integrations/supabase/services/community-posts";
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
import { WellbeingHelpCard } from "@/components/wellbeing/WellbeingHelpCard";
import { AwaitingReplyBadge, PostStatusBadge, PostTypeBadge } from "./PostTypeBadge";
import { LinkifiedText } from "@/components/common/LinkifiedText";
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
  const [showPeerReportDialog, setShowPeerReportDialog] = useState(false);
  const [reportingPeer, setReportingPeer] = useState(false);
  const isCompact = variant === "compact";
  const postedAt = formatRelativeTime(post.created_at);

  const handleAuthorClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (post.is_anonymous) return;
    if (onAuthorClick) {
      onAuthorClick(post.author.id, event);
    } else if (post.author.is_mentor) {
      navigate(`/mentor/${post.author.id}`);
    }
  };

  const handlePeerReport = async () => {
    setReportingPeer(true);
    const { error } = await reportPeerConcern("post", post.id);
    setReportingPeer(false);
    setShowPeerReportDialog(false);
    if (error) {
      toast.error("Could not submit report. Please reach out to campus staff directly.");
    } else {
      toast.success("Thank you for looking out for your peer. Our moderation team has been notified.");
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
  const hasGroupLink = /\/(communities|workspace-groups)\/[^\s<]+/i.test(post.content);
  const isLongText = post.content.length > 180 || (post.content.match(/\n/g) || []).length >= 3;

  const handleCardClick = () => {
    if (isCompact) {
      if (onOpen) {
        onOpen(post.id);
      } else {
        navigate(`/posts#post-${post.id}`);
      }
    } else if (isLongText && !hasGroupLink) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <>
      <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-colors duration-150 select-text",
        (isCompact || isLongText) && "cursor-pointer hover:border-foreground/20",
        className,
      )}
      onClick={handleCardClick}
    >
      {/* ── Body ── */}
      <div className={cn("relative flex flex-1 flex-col gap-3 px-4", isCompact ? "py-4" : "py-5")}>

        {/* ── Top Header: Author details & Post Type Badges ── */}
        <div className="flex items-start justify-between gap-3">
          {/* Author avatar & info */}
          {post.is_anonymous ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                <User className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="min-w-0 leading-tight text-left">
                <div className="flex items-center gap-1">
                  <span className="truncate text-xs font-semibold text-foreground text-left">
                    Anonymous student
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span className="shrink-0">{postedAt}</span>
                  {post.viewer_is_author && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-primary font-medium">Only you see this is yours</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5">
              <Avatar
                className="h-9 w-9 shrink-0 cursor-pointer border transition-colors duration-150 hover:border-foreground/30"
                onClick={handleAuthorClick}
              >
                <AvatarImage src={post.author.profile_image ?? undefined} alt={post.author.name} />
                <AvatarFallback className="bg-secondary text-xs font-medium text-secondary-foreground">
                  {getInitials(post.author.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 leading-tight text-left">
                <div className="flex items-center gap-1">
                  <span
                    className="truncate text-xs font-semibold text-foreground text-left cursor-pointer hover:text-primary hover:underline transition-colors"
                    onClick={handleAuthorClick}
                  >
                    {post.author.name}
                  </span>
                  {post.author.is_mentor && (
                    <BadgeCheck
                      className="h-3.5 w-3.5 shrink-0 text-primary cursor-pointer"
                      aria-label="Verified mentor"
                      onClick={handleAuthorClick}
                    />
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  {post.author.department && (
                    <>
                      <span className="truncate max-w-[120px]">{post.author.department}</span>
                      <span aria-hidden>·</span>
                    </>
                  )}
                  <span className="shrink-0">{postedAt}</span>
                </div>
              </div>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0">
            <PostTypeBadge type={post.post_type} />
            <PostStatusBadge status={post.status} />
            {isAwaitingReply(post) && <AwaitingReplyBadge />}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(event) => event.stopPropagation()}
                  aria-label="Post options"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                {post.viewer_is_author && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(post)}>
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                )}
                {post.viewer_is_author && onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                    onClick={() => onDelete(post)}
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                )}
                {!post.viewer_is_author && (
                  <DropdownMenuItem
                    onClick={() => setShowPeerReportDialog(true)}
                    className="cursor-pointer text-muted-foreground hover:text-foreground"
                  >
                    <HeartHandshake className="mr-2 h-3.5 w-3.5 text-rose-500" />
                    I&apos;m worried about this person
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title + content */}
        <div className={cn("space-y-1.5 text-left", isCompactTextOnly && "flex-1")}>
          <h3
            className={cn(
              "font-semibold leading-snug tracking-tight text-left text-foreground",
              isCompact ? "line-clamp-2 text-base" : "text-lg",
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
                    navigate(`/posts#post-${post.id}`);
                  }
                } else {
                  setIsExpanded((prev) => !prev);
                }
              }}
              className="mt-1 inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{isCompact ? "Read full post" : isExpanded ? "Show less" : "Read full post"}</span>
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

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, isCompact ? 2 : 6).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs font-normal text-muted-foreground"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Well-being post help card */}
        {post.post_type === "wellbeing" && (
          <div className="pt-1">
            <WellbeingHelpCard compact />
          </div>
        )}
      </div>

      {/* ── Footer — strictly action buttons ── */}
      <div
        className="relative flex items-center justify-between gap-1 border-t px-2 py-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 gap-1.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground",
                post.viewer_has_liked && "text-rose-600 hover:text-rose-600 dark:text-rose-400",
              )}
              onClick={onLike ? (event) => onLike(post.id, event) : undefined}
              aria-pressed={post.viewer_has_liked}
              aria-label={post.viewer_has_liked ? "Unlike post" : "Like post"}
            >
              <Heart className={cn("h-4 w-4", post.viewer_has_liked && "fill-current")} />
              <span className="tabular">{post.likes_count > 0 ? post.likes_count : "Like"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1 text-xs font-medium">
            {post.viewer_has_liked ? "Liked" : "Like"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 gap-1.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                onComment?.(post.id, event);
              }}
              aria-label="Comments"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="tabular">{post.comments_count > 0 ? `${post.comments_count} comment${post.comments_count > 1 ? "s" : ""}` : "Comment"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1 text-xs font-medium">
            {post.comments_count > 0 ? `${post.comments_count} comments` : "Write a comment"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-10 gap-1.5 px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={onShare ? (event) => onShare(post, event) : undefined}
              aria-label="Share post"
            >
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="flex items-center gap-1 text-xs font-medium">
            Share link
          </TooltipContent>
        </Tooltip>
      </div>
    </Card>

    {/* Peer concern report confirmation dialog */}
    <AlertDialog open={showPeerReportDialog} onOpenChange={setShowPeerReportDialog}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Flag concern for campus moderators?</AlertDialogTitle>
          <AlertDialogDescription>
            If you are worried that this classmate might be going through a crisis or needs support, our team can check in on them discreetly. Your report is completely confidential.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={reportingPeer}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePeerReport}
            disabled={reportingPeer}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {reportingPeer ? "Submitting..." : "Notify moderation team"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}

export default PostCard;
