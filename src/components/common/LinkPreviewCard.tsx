import { Link } from "react-router-dom";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface LinkPreviewCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
}

/**
 * Shared anatomy for pasted internal links (mentors, faculty, events...).
 * The whole card is the link, so it gets the hover border; the action text
 * is the only brand-blue element and tells the reader where it goes.
 */
export function LinkPreviewCard({ to, icon: Icon, title, description, action }: LinkPreviewCardProps) {
  return (
    <Link
      to={to}
      onClick={(event) => event.stopPropagation()}
      className="group my-2.5 flex w-full min-w-0 items-start gap-3 rounded-lg border bg-card p-3 text-left no-underline transition-colors duration-150 hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">{title}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
        <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary">
          {action}
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

export default LinkPreviewCard;
