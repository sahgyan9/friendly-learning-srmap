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
  announcement: "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200",
  general: "bg-muted text-muted-foreground",
};

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
