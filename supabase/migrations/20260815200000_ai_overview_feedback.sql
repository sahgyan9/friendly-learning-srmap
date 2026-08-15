CREATE TABLE IF NOT EXISTS public.ai_overview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    response JSONB NOT NULL,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_overview_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback" 
ON public.ai_overview_feedback 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

GRANT INSERT ON TABLE public.ai_overview_feedback TO anon, authenticated;
