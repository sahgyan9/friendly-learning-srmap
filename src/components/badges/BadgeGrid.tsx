
import { useEffect, useState } from "react";
import { getBadgeTypes, getUserBadges, BadgeType, UserBadge } from "@/integrations/supabase/services/badges";
import BadgeCard from "./BadgeCard";
import { Skeleton } from "@/components/ui/skeleton";

interface BadgeGridProps {
  userId?: string;
  showAll?: boolean;
  maxDisplay?: number;
  size?: 'sm' | 'md' | 'lg';
}

const BadgeGrid = ({ userId, showAll = true, maxDisplay = 20, size = 'md' }: BadgeGridProps) => {
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [badgeTypesResult, userBadgesResult] = await Promise.all([
          getBadgeTypes(),
          userId ? getUserBadges(userId) : { data: [], error: null }
        ]);

        if (badgeTypesResult.data) {
          setAllBadges(badgeTypesResult.data);
        }

        if (userBadgesResult.data) {
          setUserBadges(userBadgesResult.data);
        }
      } catch (error) {
        console.error('Error fetching badge data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="w-16 h-20" />
        ))}
      </div>
    );
  }

  const badgesToShow = showAll ? allBadges : allBadges.slice(0, maxDisplay);
  const userBadgeMap = new Map(userBadges.map(ub => [ub.badge_type_id, ub]));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {badgesToShow.map((badge) => {
        const userBadge = userBadgeMap.get(badge.id);
        return (
          <BadgeCard
            key={badge.id}
            badge={badge}
            awarded={!!userBadge}
            awardedDate={userBadge?.awarded_at}
            showDescription={true}
            size={size}
          />
        );
      })}
    </div>
  );
};

export default BadgeGrid;
