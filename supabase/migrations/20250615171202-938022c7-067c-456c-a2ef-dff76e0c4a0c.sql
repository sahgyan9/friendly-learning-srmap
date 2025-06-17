
-- Create mentor_reviews table to store individual ratings and reviews
CREATE TABLE public.mentor_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Ensure one review per user per mentor
  UNIQUE(mentor_id, reviewer_id)
);

-- Enable RLS on mentor_reviews
ALTER TABLE public.mentor_reviews ENABLE ROW LEVEL SECURITY;

-- Users can view all reviews (public information)
CREATE POLICY "Anyone can view mentor reviews" 
  ON public.mentor_reviews 
  FOR SELECT 
  USING (true);

-- Users can create reviews for mentors they've interacted with
CREATE POLICY "Users can create reviews for mentors they've messaged" 
  ON public.mentor_reviews 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE (c.user1_id = auth.uid() AND c.user2_id = mentor_id)
         OR (c.user2_id = auth.uid() AND c.user1_id = mentor_id)
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" 
  ON public.mentor_reviews 
  FOR UPDATE 
  USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" 
  ON public.mentor_reviews 
  FOR DELETE 
  USING (auth.uid() = reviewer_id);

-- Function to calculate and update mentor ratings
CREATE OR REPLACE FUNCTION public.update_mentor_rating(mentor_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_rating NUMERIC;
  review_count INTEGER;
BEGIN
  -- Calculate average rating and count
  SELECT 
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO avg_rating, review_count
  FROM public.mentor_reviews
  WHERE mentor_reviews.mentor_id = update_mentor_rating.mentor_id;

  -- Update mentor table
  UPDATE public.mentors
  SET 
    rating = avg_rating,
    review_count = review_count
  WHERE id = mentor_id;
END;
$$;

-- Trigger to automatically update mentor ratings when reviews change
CREATE OR REPLACE FUNCTION public.handle_mentor_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM public.update_mentor_rating(NEW.mentor_id);
    RETURN NEW;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    PERFORM public.update_mentor_rating(OLD.mentor_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for mentor_reviews table
CREATE TRIGGER mentor_review_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON public.mentor_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_mentor_review_change();

-- Function to check if a user can rate a mentor (has had conversation)
CREATE OR REPLACE FUNCTION public.can_user_rate_mentor(user_id UUID, mentor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE (user1_id = user_id AND user2_id = mentor_id)
       OR (user2_id = user_id AND user1_id = mentor_id)
  ) AND NOT EXISTS (
    SELECT 1 FROM public.mentor_reviews
    WHERE reviewer_id = user_id AND mentor_reviews.mentor_id = can_user_rate_mentor.mentor_id
  );
$$;

-- Function to get mentor reviews with reviewer information
CREATE OR REPLACE FUNCTION public.get_mentor_reviews(mentor_id UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  review_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  reviewer_name TEXT,
  reviewer_image TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    mr.id,
    mr.rating,
    mr.review_text,
    mr.created_at,
    u.name as reviewer_name,
    u.profile_image as reviewer_image
  FROM public.mentor_reviews mr
  JOIN public.users u ON mr.reviewer_id = u.id
  WHERE mr.mentor_id = get_mentor_reviews.mentor_id
  ORDER BY mr.created_at DESC;
$$;
