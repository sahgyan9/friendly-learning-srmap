-- Migration: 20260816100000_search_interactions.sql
-- Description: Phase 3 Click-Through Tracking & Feedback Loop



-- 1. search_interactions (Raw clicks)
CREATE TABLE public.search_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR(64) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.search_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert search interactions" ON public.search_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view interactions" ON public.search_interactions FOR SELECT USING (
  auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)
);

-- 2. search_result_quality (Aggregated 30-day clicks)
CREATE TABLE public.search_result_quality (
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  click_count_30d INT NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

ALTER TABLE public.search_result_quality ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read search quality" ON public.search_result_quality FOR SELECT USING (true);
-- No insert/update for public/anon

-- 3. RPC: log_search_click
CREATE OR REPLACE FUNCTION public.log_search_click(
  p_query text,
  p_entity_type text,
  p_entity_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_query_hash text;
BEGIN
  -- Normalize query: trim, lowercase, collapse whitespace, then hash
  v_query_hash := md5(regexp_replace(lower(trim(p_query)), '\s+', ' ', 'g'));
  
  INSERT INTO public.search_interactions (query_hash, entity_type, entity_id, viewer_id)
  VALUES (v_query_hash, p_entity_type, p_entity_id, auth.uid());
END;
$$;

-- 4. RPC: aggregate_search_quality
CREATE OR REPLACE FUNCTION public.aggregate_search_quality()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Roll up raw clicks from last 30 days
  INSERT INTO public.search_result_quality (entity_type, entity_id, click_count_30d, last_clicked_at)
  SELECT 
    entity_type, 
    entity_id, 
    count(*)::int as click_count_30d,
    max(created_at) as last_clicked_at
  FROM public.search_interactions
  WHERE created_at >= now() - interval '30 days'
  GROUP BY entity_type, entity_id
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    click_count_30d = EXCLUDED.click_count_30d,
    last_clicked_at = EXCLUDED.last_clicked_at;
    
  -- Zero out entities that haven't received a click in the last 30 days
  UPDATE public.search_result_quality srq
  SET click_count_30d = 0
  WHERE NOT EXISTS (
    SELECT 1 FROM public.search_interactions si 
    WHERE si.entity_type = srq.entity_type 
      AND si.entity_id = srq.entity_id 
      AND si.created_at >= now() - interval '30 days'
  );
END;
$$;

-- 5. pg_cron Schedule (runs nightly at 2 AM)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'aggregate-search-quality-nightly') THEN
    PERFORM cron.schedule(
      'aggregate-search-quality-nightly',
      '0 2 * * *',
      $cron$ SELECT public.aggregate_search_quality(); $cron$
    );
  END IF;
END $$;
