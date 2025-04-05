-- Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    price DECIMAL(10,2),
    features TEXT[] NOT NULL,
    cta_text TEXT NOT NULL,
    cta_url TEXT NOT NULL,
    badge_text TEXT,
    badge_color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to active ads"
    ON public.ads
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Allow admin to create ads"
    ON public.ads
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE email = 'sahgyan9@gmail.com'
        )
    );

CREATE POLICY "Allow admin to update their own ads"
    ON public.ads
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE email = 'sahgyan9@gmail.com'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE email = 'sahgyan9@gmail.com'
        )
    );

CREATE POLICY "Allow admin to delete their own ads"
    ON public.ads
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE email = 'sahgyan9@gmail.com'
        )
    );

-- Create indexes
CREATE INDEX idx_ads_created_at ON public.ads(created_at DESC);
CREATE INDEX idx_ads_created_by ON public.ads(created_by);
CREATE INDEX idx_ads_is_active ON public.ads(is_active); 