import { BadgeType } from "@/integrations/supabase/services/badges";
import { cn } from "@/lib/utils";
import { badgeIconFor } from "./badgeIcon";

interface BadgeCardProps {
  badge: BadgeType;
  awarded?: boolean;
  awardedDate?: string;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: "h-12 w-12 p-1",
  md: "min-h-[7rem] w-full p-3",
  lg: "min-h-[8rem] w-full p-3",
} as const;

const ICON_SIZES = {
  sm: "h-5 w-5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
} as const;

const BadgeCard = ({
  badge,
  awarded = false,
  awardedDate,
  showDescription = false,
  size = 'md'
}: BadgeCardProps) => {
  const Icon = badgeIconFor(badge.category);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg border bg-card text-center",
        SIZE_CLASSES[size],
        awarded ? "border-border" : "border-dashed border-border opacity-60",
      )}
      title={showDescription ? badge.description ?? undefined : badge.name}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
        <Icon className={cn(ICON_SIZES[size], "text-foreground")} aria-hidden />
      </span>
      {size !== 'sm' && (
        <>
          <p className="text-sm font-medium leading-tight text-foreground">{badge.name}</p>
          <p className="text-2xs capitalize text-muted-foreground">{badge.category}</p>
          {awarded && awardedDate && (
            <p className="text-2xs text-muted-foreground tabular">
              {new Date(awardedDate).toLocaleDateString()}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default BadgeCard;
