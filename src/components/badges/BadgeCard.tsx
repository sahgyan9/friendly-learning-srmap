
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BadgeType } from "@/integrations/supabase/services/badges";

interface BadgeCardProps {
  badge: BadgeType;
  awarded?: boolean;
  awardedDate?: string;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const BadgeCard = ({ 
  badge, 
  awarded = false, 
  awardedDate, 
  showDescription = false,
  size = 'md'
}: BadgeCardProps) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xs',
    md: 'w-16 h-16 text-sm',
    lg: 'w-20 h-20 text-base'
  };

  const iconSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <div className="group relative">
      <Card 
        className={`${sizeClasses[size]} flex flex-col items-center justify-center p-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${
          awarded 
            ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-amber-200 dark:from-yellow-950/20 dark:to-amber-950/20 dark:border-amber-800' 
            : 'bg-muted border-border opacity-60'
        }`}
        style={{ 
          borderColor: awarded ? badge.color : undefined,
          boxShadow: awarded ? `0 0 20px ${badge.color}20` : undefined
        }}
      >
        <div className={`${iconSizes[size]} mb-1`}>
          {badge.icon}
        </div>
        {size !== 'sm' && (
          <div className="text-center">
            <p className="font-medium text-foreground leading-tight">
              {badge.name}
            </p>
            {awarded && awardedDate && (
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(awardedDate).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Category badge */}
      <Badge 
        variant="secondary" 
        className="absolute -top-2 -right-2 text-xs"
        style={{ backgroundColor: badge.color, color: 'white' }}
      >
        {badge.category}
      </Badge>

      {/* Tooltip for description */}
      {showDescription && badge.description && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground border border-border text-sm rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 max-w-xs">
          <p className="font-medium">{badge.name}</p>
          <p className="text-xs mt-1">{badge.description}</p>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
        </div>
      )}
    </div>
  );
};

export default BadgeCard;
