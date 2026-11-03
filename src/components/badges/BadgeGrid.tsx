import type { EnrichedUserBadge } from "@/hooks/useBadges";
import { badgeIconFor } from "./badgeIcon";

interface BadgeGridProps {
  badges: EnrichedUserBadge[];
  maxDisplay?: number;
}

const BadgeGrid = ({ badges, maxDisplay = 3 }: BadgeGridProps) => {
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayBadges.map((badge, index) => {
        const Icon = badgeIconFor(badge.badge_type?.category);
        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
            title={badge.badge_type?.description}
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {badge.badge_type?.name}
          </span>
        );
      })}
      {remainingCount > 0 && (
        <span className="text-xs text-muted-foreground tabular">+{remainingCount}</span>
      )}
    </div>
  );
};

export default BadgeGrid;
