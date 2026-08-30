-- Migration: Allow everyone to rate mentors
-- Removes the legacy requirement that a student must have messaged a mentor in public.conversations
-- before being allowed to leave a review.
-- Mentors still cannot rate themselves (reviewer_id <> mentor_id).

-- 1. Replace INSERT policy on mentor_reviews
DROP POLICY IF EXISTS "Users can create reviews for mentors they've messaged" ON public.mentor_reviews;
DROP POLICY IF EXISTS "Users can create reviews for mentors" ON public.mentor_reviews;

CREATE POLICY "Users can create reviews for mentors"
  ON public.mentor_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    auth.uid() <> mentor_id
  );

-- 2. Ensure UPDATE & DELETE policies are clean and explicit
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.mentor_reviews;
CREATE POLICY "Users can update their own reviews"
  ON public.mentor_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.mentor_reviews;
CREATE POLICY "Users can delete their own reviews"
  ON public.mentor_reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = reviewer_id);

-- 3. Ensure SELECT policy allows reading reviews
DROP POLICY IF EXISTS "Anyone can view mentor reviews" ON public.mentor_reviews;
CREATE POLICY "Anyone can view mentor reviews"
  ON public.mentor_reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 4. Table-level grants
REVOKE ALL ON public.mentor_reviews FROM anon, authenticated;
GRANT SELECT ON public.mentor_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mentor_reviews TO authenticated;

-- 5. Update can_user_rate_mentor function
CREATE OR REPLACE FUNCTION public.can_user_rate_mentor(user_id UUID, mentor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (user_id IS NOT NULL AND mentor_id IS NOT NULL AND user_id <> mentor_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.mentor_reviews
      WHERE reviewer_id = user_id AND mentor_reviews.mentor_id = can_user_rate_mentor.mentor_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_user_rate_mentor(UUID, UUID) TO authenticated;

-- 6. Ensure trigger functions and trigger exist for rating aggregation
CREATE OR REPLACE FUNCTION public.update_mentor_rating(mentor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, total_reviews
  FROM public.mentor_reviews
  WHERE mentor_reviews.mentor_id = update_mentor_rating.mentor_id;

  UPDATE public.mentors
  SET 
    rating = avg_rating,
    review_count = total_reviews
  WHERE id = mentor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_mentor_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_mentor_rating(NEW.mentor_id);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.update_mentor_rating(OLD.mentor_id);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS mentor_review_rating_update ON public.mentor_reviews;
CREATE TRIGGER mentor_review_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON public.mentor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mentor_review_change();
