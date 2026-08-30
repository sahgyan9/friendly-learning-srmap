import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MentorReviewData {
  id: string;
  rating: number;
  review_text: string | null;
}

/**
 * Hook for managing mentor rating eligibility and existing review state.
 *
 * All students can rate mentors (except their own profile).
 * Returns `canRate`, `hasRated`, `existingReview`, and `refreshRatingStatus`.
 */
export const useRating = (mentorId: string) => {
  const { user } = useAuth();
  const [canRate, setCanRate] = useState(true);
  const [hasRated, setHasRated] = useState(false);
  const [existingReview, setExistingReview] = useState<MentorReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkRatingEligibility = useCallback(async () => {
    if (!mentorId) {
      setCanRate(false);
      setHasRated(false);
      setExistingReview(null);
      setIsLoading(false);
      return;
    }

    // A mentor cannot rate their own profile
    if (user?.id && user.id === mentorId) {
      setCanRate(false);
      setHasRated(false);
      setExistingReview(null);
      setIsLoading(false);
      return;
    }

    // Unauthenticated visitors can trigger the rate button (which prompts sign-in)
    if (!user?.id) {
      setCanRate(true);
      setHasRated(false);
      setExistingReview(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const { data: review, error: reviewError } = await supabase
        .from("mentor_reviews")
        .select("id, rating, review_text")
        .eq("mentor_id", mentorId)
        .eq("reviewer_id", user.id)
        .maybeSingle();

      if (reviewError) {
        console.error("Error checking existing review:", reviewError);
      }

      if (review) {
        setHasRated(true);
        setExistingReview(review);
        setCanRate(true);
      } else {
        setHasRated(false);
        setExistingReview(null);
        setCanRate(true);
      }
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
    canRate,
    hasRated,
    existingReview,
    isLoading,
    refreshRatingStatus: checkRatingEligibility,
  };
};

