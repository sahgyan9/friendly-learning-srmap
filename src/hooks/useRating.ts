import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Whether the signed-in user may leave a review for a mentor.
 *
 * `refreshRatingStatus` previously just reset local state and set `isLoading`
 * to true — it never re-ran the query, so after submitting a review the UI sat
 * on a spinner forever. The check now lives in a callback the effect calls, so
 * refreshing genuinely re-checks.
 */
export const useRating = (mentorId: string) => {
  const { user } = useAuth();
  const [canRate, setCanRate] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkRatingEligibility = useCallback(async () => {
    if (!user?.id || !mentorId) {
      setCanRate(false);
      setHasRated(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [{ data: eligible, error: eligibleError }, { data: existingReview, error: reviewError }] =
        await Promise.all([
          supabase.rpc("can_user_rate_mentor", { user_id: user.id, mentor_id: mentorId }),
          supabase
            .from("mentor_reviews")
            .select("id")
            .eq("mentor_id", mentorId)
            .eq("reviewer_id", user.id)
            .maybeSingle(),
        ]);

      if (eligibleError) {
        console.error("Error checking rating eligibility:", eligibleError);
      }
      if (reviewError) {
        console.error("Error checking existing review:", reviewError);
      }

      setCanRate(Boolean(eligible));
      setHasRated(Boolean(existingReview));
    } catch (error) {
      console.error("Error in rating check:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, mentorId]);

  useEffect(() => {
    checkRatingEligibility();
  }, [checkRatingEligibility]);

  return {
    canRate: canRate && !hasRated,
    isLoading,
    hasRated,
    refreshRatingStatus: checkRatingEligibility,
  };
};
