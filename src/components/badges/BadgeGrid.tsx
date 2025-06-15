
import { Badge } from "@/components/ui/badge";

interface BadgeGridProps {
  badges: any[];
  maxDisplay?: number;
}

const BadgeGrid = ({ badges, maxDisplay = 3 }: BadgeGridProps) => {
  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-1">
      {displayBadges.map((badge, index) => (
        <div
          key={index}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-sm"
          style={{ backgroundColor: badge.badge_type?.color || '#3B82F6' }}
          title={badge.badge_type?.description}
        >
          <span className="mr-1">{badge.badge_type?.icon}</span>
          <span>{badge.badge_type?.name}</span>
        </div>
      ))}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-xs">
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
};

export default BadgeGrid;
