import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPostTypeMeta } from "@/integrations/supabase/services/community-posts";

/**
 * Post types are labels, not a legend, so every chip is the same neutral
 * surface. The type's own icon is what tells them apart at a glance; a
 * different hue per type only made the feed noisy.
 */
const NEUTRAL_CHIP = "border-transparent bg-secondary text-secondary-foreground";

/** Kept for callers that draw a type rail; it is neutral for the same reason. */
export const postTypeAccent = (_type: string) => "bg-border";

// Status colours carry meaning: fulfilled is a success, closed is inactive.
const STATUS_STYLES: Record<string, string> = {
  fulfilled: "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  closed: "border-transparent bg-muted text-muted-foreground",
};

export function PostTypeBadge({ type, className }: { type: string; className?: string }) {
  const meta = getPostTypeMeta(type);
  const Icon = meta.icon;

  return (
    <Badge variant="secondary" className={cn("gap-1 font-medium", NEUTRAL_CHIP, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {meta.label}
    </Badge>
  );
}

export function PostStatusBadge({ status, className }: { status: string; className?: string }) {
  // "Open" is the default and adds no information; only call out the exceptions.
  if (status === "open") return null;

  return (
    <Badge
      variant="secondary"
      className={cn("font-medium capitalize", STATUS_STYLES[status] ?? STATUS_STYLES.closed, className)}
    >
      {status}
    </Badge>
  );
}

/**
 * Marks an ask nobody has answered.
 *
 * A request with ten replies and a request with none looked identical, so the
 * board gave no clue where help was actually wanted — the posts most in need of
 * an answer were the least distinguishable.
 *
 * The wording is a fact, not an instruction. "No replies yet" is verifiably
 * true from comments_count; "Needs help" or "Answer this" would be us deciding
 * on the author's behalf what they still want, when they may have sorted it out
 * over DM and never come back to close the post.
 *
 * Outline rather than a colour fill: it should read as a quiet gap in the feed,
 * not as an error or a warning about the post.
 */
export function AwaitingReplyBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-dashed font-normal text-muted-foreground", className)}
    >
      No replies yet
    </Badge>
  );
}
