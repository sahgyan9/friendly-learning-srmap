
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  getBadgeTypes, 
  getUserBadges, 
  BadgeType, 
  UserBadge 
} from "@/integrations/supabase/services/badges";

export const useBadges = (userId?: string) => {
  const { user } = useAuth();
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    const fetchBadges = async () => {
      if (!targetUserId) return;
      
      setLoading(true);
      try {
        const [badgeTypesResult, userBadgesResult] = await Promise.all([
          getBadgeTypes(),
          getUserBadges(targetUserId)
        ]);

        if (badgeTypesResult.data) {
          setBadgeTypes(badgeTypesResult.data);
        }

        if (userBadgesResult.data) {
          // Ensure each user badge has the badge_type populated
          const enrichedUserBadges = userBadgesResult.data.map((userBadge: any) => ({
            ...userBadge,
            badge_type: userBadge.badge_type || badgeTypesResult.data?.find((bt: BadgeType) => bt.id === userBadge.badge_type_id)
          }));
          setUserBadges(enrichedUserBadges);
        }
      } catch (error) {
        console.error('Error fetching badges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBadges();
  }, [targetUserId]);

  const getBadgesByCategory = (category: string) => {
    return badgeTypes.filter(badge => badge.category === category);
  };

  const getUserBadgesByCategory = (category: string) => {
    return userBadges.filter(userBadge => {
      const badgeType = userBadge.badge_type || badgeTypes.find(bt => bt.id === userBadge.badge_type_id);
      return badgeType?.category === category;
    });
  };

  const getUserBadgesForMentor = (mentorId: string) => {
    if (mentorId === targetUserId) {
      return userBadges.map(userBadge => ({
        ...userBadge,
        badge_type: userBadge.badge_type || badgeTypes.find(bt => bt.id === userBadge.badge_type_id)
      }));
    }
    return [];
  };

  return {
    badgeTypes,
    userBadges,
    loading,
    getBadgesByCategory,
    getUserBadgesByCategory,
    getUserBadges: getUserBadgesForMentor,
    refetch: () => {
      if (targetUserId) {
        const fetchBadges = async () => {
          setLoading(true);
          try {
            const [badgeTypesResult, userBadgesResult] = await Promise.all([
              getBadgeTypes(),
              getUserBadges(targetUserId)
            ]);

            if (badgeTypesResult.data) {
              setBadgeTypes(badgeTypesResult.data);
            }

            if (userBadgesResult.data) {
              const enrichedUserBadges = userBadgesResult.data.map((userBadge: any) => ({
                ...userBadge,
                badge_type: userBadge.badge_type || badgeTypesResult.data?.find((bt: BadgeType) => bt.id === userBadge.badge_type_id)
              }));
              setUserBadges(enrichedUserBadges);
            }
          } catch (error) {
            console.error('Error fetching badges:', error);
          } finally {
            setLoading(false);
          }
        };
        fetchBadges();
      }
    }
  };
};
