
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
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
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
          setUserBadges(userBadgesResult.data);
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
      const badgeType = badgeTypes.find(bt => bt.id === userBadge.badge_type_id);
      return badgeType?.category === category;
    });
  };

  const getUserBadgesForMentor = (mentorId: string) => {
    if (mentorId === targetUserId) {
      return userBadges.map(userBadge => {
        const badgeType = badgeTypes.find(bt => bt.id === userBadge.badge_type_id);
        return {
          ...userBadge,
          badge_type: badgeType
        };
      });
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
              setUserBadges(userBadgesResult.data);
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
