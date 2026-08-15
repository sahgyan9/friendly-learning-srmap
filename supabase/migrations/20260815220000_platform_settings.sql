-- supabase/migrations/20260815220000_platform_settings.sql

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default value for AI Overview
INSERT INTO public.platform_settings (id, value)
VALUES ('ai_overview_enabled', 'true'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (anon and authenticated)
CREATE POLICY "Allow public read access on platform_settings"
ON public.platform_settings FOR SELECT
USING (true);

-- Allow update access only to admins
CREATE POLICY "Admins can update platform_settings"
ON public.platform_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Grant privileges
GRANT SELECT ON TABLE public.platform_settings TO anon, authenticated;
GRANT UPDATE ON TABLE public.platform_settings TO authenticated;
