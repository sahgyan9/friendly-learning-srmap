
-- Create badge types table
CREATE TABLE public.badge_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3B82F6',
  category TEXT CHECK (category IN ('performance', 'expertise', 'contribution', 'special')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user badges table (junction table)
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_type_id UUID REFERENCES public.badge_types(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES public.users(id),
  awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, badge_type_id)
);

-- Create mentor verification table
CREATE TABLE public.mentor_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES public.users(id),
  rejection_reason TEXT,
  application_data JSONB
);

-- Create AI conversation history table
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('message', 'badge', 'mention', 'system')),
  title TEXT NOT NULL,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to existing users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS skills TEXT[],
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending';

-- Add new columns to existing messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Enable RLS on new tables
ALTER TABLE public.badge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badge_types (readable by all, manageable by admins)
CREATE POLICY "Badge types are viewable by everyone" ON public.badge_types
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage badge types" ON public.badge_types
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- RLS Policies for user_badges
CREATE POLICY "User badges are viewable by everyone" ON public.user_badges
FOR SELECT USING (true);

CREATE POLICY "Only admins can award badges" ON public.user_badges
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Only admins can manage badges" ON public.user_badges
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- RLS Policies for mentor_verifications
CREATE POLICY "Users can view their own verification" ON public.mentor_verifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can submit verification" ON public.mentor_verifications
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all verifications" ON public.mentor_verifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- RLS Policies for AI conversations
CREATE POLICY "Users can view their own AI conversations" ON public.ai_conversations
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create AI conversations" ON public.ai_conversations
FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (true);

-- Insert some default badge types
INSERT INTO public.badge_types (name, description, icon, color, category) VALUES
('Top Mentor', 'Awarded to mentors with highest ratings', '🏆', '#FFD700', 'performance'),
('Rising Star', 'Awarded to new mentors showing great potential', '⭐', '#FF6B6B', 'performance'),
('Python Expert', 'Expert in Python programming', '🐍', '#3776AB', 'expertise'),
('JavaScript Expert', 'Expert in JavaScript development', '💛', '#F7DF1E', 'expertise'),
('Data Science Guru', 'Expert in data science and machine learning', '📊', '#FF6B35', 'expertise'),
('Community Builder', 'Active in building the mentorship community', '🤝', '#4ECDC4', 'contribution'),
('Problem Solver', 'Excellent at helping solve complex problems', '🧩', '#A8E6CF', 'contribution'),
('Consistent Helper', 'Regularly helps students with dedication', '💪', '#88D8B0', 'contribution'),
('Admin Choice', 'Special recognition from platform administrators', '👑', '#6C63FF', 'special'),
('Student Favorite', 'Highly rated by students', '❤️', '#FF4757', 'special');

-- Create function to automatically award badges based on performance
CREATE OR REPLACE FUNCTION public.auto_award_performance_badges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Award Top Mentor badge to mentors with rating >= 4.5 and review_count >= 10
  INSERT INTO public.user_badges (user_id, badge_type_id, notes)
  SELECT DISTINCT 
    m.id as user_id,
    bt.id as badge_type_id,
    'Auto-awarded for exceptional performance'
  FROM public.mentors m
  JOIN public.badge_types bt ON bt.name = 'Top Mentor'
  WHERE m.rating >= 4.5 
    AND m.review_count >= 10
    AND NOT EXISTS (
      SELECT 1 FROM public.user_badges ub 
      WHERE ub.user_id = m.id AND ub.badge_type_id = bt.id
    );

  -- Award Rising Star badge to new mentors with good performance
  INSERT INTO public.user_badges (user_id, badge_type_id, notes)
  SELECT DISTINCT 
    m.id as user_id,
    bt.id as badge_type_id,
    'Auto-awarded for promising new mentor'
  FROM public.mentors m
  JOIN public.badge_types bt ON bt.name = 'Rising Star'
  WHERE m.rating >= 4.0 
    AND m.review_count >= 3
    AND m.review_count < 10
    AND m.created_at > NOW() - INTERVAL '3 months'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_badges ub 
      WHERE ub.user_id = m.id AND ub.badge_type_id = bt.id
    );
END;
$$;

-- Create function to handle badge notifications
CREATE OR REPLACE FUNCTION public.notify_badge_award()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  badge_name TEXT;
BEGIN
  -- Get badge name
  SELECT name INTO badge_name
  FROM public.badge_types
  WHERE id = NEW.badge_type_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, content, data)
  VALUES (
    NEW.user_id,
    'badge',
    'New Badge Earned!',
    'Congratulations! You have earned the "' || badge_name || '" badge.',
    jsonb_build_object('badge_type_id', NEW.badge_type_id, 'badge_name', badge_name)
  );

  RETURN NEW;
END;
$$;

-- Create trigger for badge notifications
CREATE TRIGGER badge_award_notification
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_badge_award();

-- Create function to update mentor verification status
CREATE OR REPLACE FUNCTION public.update_verification_status(
  verification_id UUID,
  new_status TEXT,
  admin_id UUID,
  reason TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if the requester is admin
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can update verification status';
  END IF;

  -- Update verification status
  UPDATE public.mentor_verifications
  SET 
    status = new_status,
    reviewed_at = NOW(),
    reviewed_by = admin_id,
    rejection_reason = CASE WHEN new_status = 'rejected' THEN reason ELSE NULL END
  WHERE id = verification_id
  RETURNING user_id INTO target_user_id;

  -- Update user verification status
  UPDATE public.users
  SET verification_status = new_status
  WHERE id = target_user_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (
    target_user_id,
    'system',
    CASE 
      WHEN new_status = 'verified' THEN 'Mentor Application Approved!'
      WHEN new_status = 'rejected' THEN 'Mentor Application Update'
      ELSE 'Mentor Application Status Updated'
    END,
    CASE 
      WHEN new_status = 'verified' THEN 'Congratulations! Your mentor application has been approved. You can now start mentoring students.'
      WHEN new_status = 'rejected' THEN 'Your mentor application requires attention. ' || COALESCE(reason, 'Please contact support for more information.')
      ELSE 'Your mentor application status has been updated to: ' || new_status
    END
  );
END;
$$;
