
-- Fix the ambiguous column reference in update_mentor_rating function
CREATE OR REPLACE FUNCTION public.update_mentor_rating(mentor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Calculate average rating and count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM public.mentor_reviews
  WHERE mentor_reviews.mentor_id = update_mentor_rating.mentor_id;

  -- Update mentor table
  UPDATE public.mentors
  SET 
    rating = avg_rating,
    review_count = total_reviews
  WHERE id = mentor_id;
END;
$$;
