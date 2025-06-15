
-- First, let's check the current mentor data to see what ratings are stored
SELECT id, name, rating, review_count FROM public.mentors WHERE review_count = 0;

-- Update any mentors with 0 reviews to have a 0 rating instead of 4.0
UPDATE public.mentors 
SET rating = 0 
WHERE review_count = 0 AND rating > 0;

-- Update the default rating for new mentors to be 0 instead of 4.0
ALTER TABLE public.mentors 
ALTER COLUMN rating SET DEFAULT 0;
