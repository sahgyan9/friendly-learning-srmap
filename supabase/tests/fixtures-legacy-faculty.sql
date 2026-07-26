-- Faculty table
CREATE TABLE public.faculty (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT NOT NULL,
  school TEXT,
  email TEXT,
  profile_image TEXT,
  avg_rating NUMERIC NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view faculty"
  ON public.faculty FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert faculty"
  ON public.faculty FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Only admins can update faculty"
  ON public.faculty FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Only admins can delete faculty"
  ON public.faculty FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE INDEX idx_faculty_department ON public.faculty(department);
CREATE INDEX idx_faculty_school ON public.faculty(school);

-- Faculty ratings table
CREATE TABLE public.faculty_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  faculty_id UUID NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (faculty_id, reviewer_id)
);

ALTER TABLE public.faculty_ratings ENABLE ROW LEVEL SECURITY;

-- NO public SELECT policy — reads must go through RPC for anonymity
-- Users can only see if they themselves rated (to enforce "already rated" UI)
CREATE POLICY "Users can view their own ratings only"
  ON public.faculty_ratings FOR SELECT
  TO authenticated
  USING (reviewer_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own rating"
  ON public.faculty_ratings FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can update their own rating"
  ON public.faculty_ratings FOR UPDATE
  TO authenticated
  USING (reviewer_id = auth.uid())
  WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Users can delete their own rating"
  ON public.faculty_ratings FOR DELETE
  TO authenticated
  USING (reviewer_id = auth.uid());

CREATE INDEX idx_faculty_ratings_faculty_id ON public.faculty_ratings(faculty_id);

-- Public RPC: returns ratings WITHOUT reviewer_id (anonymous)
CREATE OR REPLACE FUNCTION public.get_faculty_ratings(p_faculty_id UUID)
RETURNS TABLE (
  id UUID,
  rating INTEGER,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT fr.id, fr.rating, fr.comment, fr.created_at
  FROM public.faculty_ratings fr
  WHERE fr.faculty_id = p_faculty_id
  ORDER BY fr.created_at DESC;
$$;

-- Trigger to keep faculty.avg_rating and rating_count in sync
CREATE OR REPLACE FUNCTION public.update_faculty_rating_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_faculty_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_faculty_id := OLD.faculty_id;
  ELSE
    target_faculty_id := NEW.faculty_id;
  END IF;

  UPDATE public.faculty
  SET
    avg_rating = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM public.faculty_ratings WHERE faculty_id = target_faculty_id), 0),
    rating_count = (SELECT COUNT(*) FROM public.faculty_ratings WHERE faculty_id = target_faculty_id),
    updated_at = now()
  WHERE id = target_faculty_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_faculty_rating_stats
AFTER INSERT OR UPDATE OR DELETE ON public.faculty_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_faculty_rating_stats();

-- updated_at trigger for faculty_ratings
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_faculty_ratings_updated_at
BEFORE UPDATE ON public.faculty_ratings
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_faculty_updated_at
BEFORE UPDATE ON public.faculty
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed faculty across SRM University AP
INSERT INTO public.faculty (name, designation, department, school) VALUES
-- School of Engineering & Sciences - Computer Science
('Dr. Manjuladevi Sankaralingam', 'Professor & HoD', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Murali Krishna Enduri', 'Associate Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Tapas Kumar Mishra', 'Associate Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Jatindra Kumar Dash', 'Associate Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Ashu Abdul', 'Assistant Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Niraj Kumar', 'Assistant Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Karthikeyan Subramanian', 'Assistant Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Priyanka Singh', 'Assistant Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Sambit Kumar Mishra', 'Assistant Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),
('Dr. Aritra Hazra', 'Assistant Professor', 'Computer Science & Engineering', 'School of Engineering & Sciences'),

-- ECE
('Dr. Pradyut Kumar Sanki', 'Associate Professor & HoD', 'Electronics & Communication Engineering', 'School of Engineering & Sciences'),
('Dr. Shaik Rafi Ahamed', 'Associate Professor', 'Electronics & Communication Engineering', 'School of Engineering & Sciences'),
('Dr. Rajesh Kumar Patjoshi', 'Associate Professor', 'Electronics & Communication Engineering', 'School of Engineering & Sciences'),
('Dr. Sunil Chinnadurai', 'Assistant Professor', 'Electronics & Communication Engineering', 'School of Engineering & Sciences'),
('Dr. Anumandla Kiran Kumar', 'Assistant Professor', 'Electronics & Communication Engineering', 'School of Engineering & Sciences'),

-- Mechanical
('Dr. Lakshmi Sirisha Maganti', 'Associate Professor & HoD', 'Mechanical Engineering', 'School of Engineering & Sciences'),
('Dr. Prakash Jadhav', 'Professor', 'Mechanical Engineering', 'School of Engineering & Sciences'),
('Dr. Jeevan Jaidi', 'Associate Professor', 'Mechanical Engineering', 'School of Engineering & Sciences'),
('Dr. Sounak Kumar Choudhury', 'Assistant Professor', 'Mechanical Engineering', 'School of Engineering & Sciences'),

-- Civil
('Dr. Venkata Dilip Kumar Pasupuleti', 'Associate Professor & HoD', 'Civil Engineering', 'School of Engineering & Sciences'),
('Dr. Jagadeesh Anmala', 'Associate Professor', 'Civil Engineering', 'School of Engineering & Sciences'),
('Dr. Suresh Nuthalapati', 'Assistant Professor', 'Civil Engineering', 'School of Engineering & Sciences'),

-- EEE
('Dr. Hari Kumar Voruganti', 'Associate Professor & HoD', 'Electrical & Electronics Engineering', 'School of Engineering & Sciences'),
('Dr. Vivekananda Mukherjee', 'Associate Professor', 'Electrical & Electronics Engineering', 'School of Engineering & Sciences'),

-- Mathematics
('Dr. Pravat Kumar Jena', 'Associate Professor & HoD', 'Mathematics', 'School of Engineering & Sciences'),
('Dr. Tanmoy Som', 'Professor', 'Mathematics', 'School of Engineering & Sciences'),
('Dr. Sasanka Roy', 'Associate Professor', 'Mathematics', 'School of Engineering & Sciences'),

-- Physics
('Dr. Ranjit Thapa', 'Professor & HoD', 'Physics', 'School of Engineering & Sciences'),
('Dr. Goutam Sheet', 'Professor', 'Physics', 'School of Engineering & Sciences'),
('Dr. Bhavtosh Bansal', 'Associate Professor', 'Physics', 'School of Engineering & Sciences'),

-- Chemistry
('Dr. Tushar Kanti Mukherjee', 'Professor & HoD', 'Chemistry', 'School of Engineering & Sciences'),
('Dr. Arnab Dutta', 'Associate Professor', 'Chemistry', 'School of Engineering & Sciences'),
('Dr. Manab Chakravarty', 'Associate Professor', 'Chemistry', 'School of Engineering & Sciences'),

-- Biology
('Dr. Imran Pancha', 'Associate Professor & HoD', 'Biological Sciences', 'School of Engineering & Sciences'),
('Dr. Kousik Pramanick', 'Associate Professor', 'Biological Sciences', 'School of Engineering & Sciences'),

-- Liberal Arts
('Dr. Anand Mishra', 'Professor & HoD', 'English', 'School of Liberal Arts & Basic Sciences'),
('Dr. Sayantan Mondal', 'Associate Professor', 'English', 'School of Liberal Arts & Basic Sciences'),
('Dr. Pavan Mandavkar', 'Assistant Professor', 'English', 'School of Liberal Arts & Basic Sciences'),
('Dr. Sayan Dey', 'Assistant Professor', 'History', 'School of Liberal Arts & Basic Sciences'),
('Dr. Madhumita Pal', 'Assistant Professor', 'Psychology', 'School of Liberal Arts & Basic Sciences'),
('Dr. Sourav Kargupta', 'Assistant Professor', 'Economics', 'School of Liberal Arts & Basic Sciences'),

-- Management (Paari School of Business)
('Dr. Bharadhwaj Sivakumaran', 'Professor & Dean', 'Management', 'Paari School of Business'),
('Dr. Subhabrata De', 'Associate Professor', 'Management', 'Paari School of Business'),
('Dr. Asit Bandyopadhayay', 'Associate Professor', 'Management', 'Paari School of Business'),
('Dr. Tanusree Dutta', 'Assistant Professor', 'Management', 'Paari School of Business'),

-- Law
('Dr. Vishnu Konoorayar K', 'Professor & Dean', 'Law', 'School of Law'),
('Dr. Mukund Sarda', 'Professor', 'Law', 'School of Law'),
('Dr. Pratyush Kumar', 'Associate Professor', 'Law', 'School of Law'),
('Dr. Aneesh V Pillai', 'Assistant Professor', 'Law', 'School of Law');