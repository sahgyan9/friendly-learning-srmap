
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export const useRating = (mentorId: string) => {
  const { user } = useAuth();
  const [canRate, setCanRate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    const checkRatingEligibility = async () => {
      if (!user?.id || !mentorId) {
        setCanRate(false);
        setIsLoading(false);
        return;
      }

      try {
        // Check if user can rate this mentor
        const { data: canRateData, error: canRateError } = await supabase.rpc(
          'can_user_rate_mentor',
          {
            user_id: user.id,
            mentor_id: mentorId
          }
        );

        if (canRateError) {
          console.error("Error checking rating eligibility:", canRateError);
          return;
        }

        setCanRate(canRateData);

        // Check if user has already rated
        const { data: existingReview, error: reviewError } = await supabase
          .from('mentor_reviews')
          .select('id')
          .eq('mentor_id', mentorId)
          .eq('reviewer_id', user.id)
          .maybeSingle();

        if (reviewError) {
          console.error("Error checking existing review:", reviewError);
          return;
        }

        setHasRated(!!existingReview);

      } catch (error) {
        console.error("Error in rating check:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkRatingEligibility();
  }, [user?.id, mentorId]);

  const refreshRatingStatus = () => {
    setIsLoading(true);
    // Re-trigger the effect
    setCanRate(false);
    setHasRated(false);
  };

  return {
    canRate: canRate && !hasRated,
    isLoading,
    hasRated,
    refreshRatingStatus
  };
};
