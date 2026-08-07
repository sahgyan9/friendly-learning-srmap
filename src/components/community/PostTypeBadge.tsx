import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPostTypeMeta } from "@/integrations/supabase/services/community-posts";

/** Per-type accent so the feed is scannable at a glance. */
const TYPE_STYLES: Record<string, string> = {
  hackathon: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "study-help": "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  project: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  research: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  "problem-solving": "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  achievement: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-200",
  announcement: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  general: "bg-muted text-muted-foreground",
};

/**
 * Accent rail down the left edge of a card. Carries the same colour as the
 * badge, so the type of an ask is readable from the shape of the feed before
 * any text is read.
 */
const TYPE_ACCENTS: Record<string, string> = {
  hackathon: "bg-amber-400",
  "study-help": "bg-sky-400",
  project: "bg-violet-400",
  research: "bg-emerald-400",
  "problem-solving": "bg-rose-400",
  achievement: "bg-yellow-400",
  announcement: "bg-orange-400",
  general: "bg-border",
};

export const postTypeAccent = (type: string) => TYPE_ACCENTS[type] ?? TYPE_ACCENTS.general;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  closed: "bg-muted text-muted-foreground",
};

export function PostTypeBadge({ type, className }: { type: string; className?: string }) {
  const meta = getPostTypeMeta(type);

  return (
    <Badge
      variant="secondary"
      className={cn("gap-1 border-0 font-medium", TYPE_STYLES[type] ?? TYPE_STYLES.general, className)}
    >
      <span aria-hidden>{meta.emoji}</span>
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
      className={cn("border-0 font-medium capitalize", STATUS_STYLES[status] ?? STATUS_STYLES.closed, className)}
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
