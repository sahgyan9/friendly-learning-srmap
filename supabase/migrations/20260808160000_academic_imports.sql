-- =============================================================================
-- academic_imports — program/subjects/CGPA scraped server-side from the SRM AP
-- student portal (student.srmap.edu.in, a third-party site we do not run), so a
-- student doesn't have to type this in by hand.
--
-- DERIVED, NEVER AUTHORITATIVE. One row per student, written only by the
-- import-srm-portal edge function using the service role. No insert/update/
-- delete policy exists for anon or authenticated on purpose: a client-side
-- write path here would let a student fabricate a verified transcript.
--
-- The portal login password used to obtain this data is a DOB in DDMMYYYY
-- format — it is used once, in memory, inside the edge function, and is never
-- a column on this table, never logged, never cached anywhere.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.academic_imports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  register_number   TEXT NOT NULL,
  program           TEXT,
  current_semester  SMALLINT,

  -- [{ "semester": 6, "code": "PHY 305", "name": "NUCLEAR AND PARTICLE PHYSICS",
  --    "credit": 4 }, ...] — from the portal's full multi-semester transcript
  -- (menu id 6), not just the current semester (id 2), so search can match on
  -- coursework from any completed semester.
  subjects          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- The portal's own computed value (same transcript page) — never derived
  -- from semester SGPAs on our side.
  cgpa              NUMERIC(4, 2),

  sync_status       TEXT NOT NULL DEFAULT 'pending'
                    CHECK (sync_status IN ('pending', 'success', 'failed')),
  last_error        TEXT,
  last_synced_at    TIMESTAMPTZ,

  -- Throttle state. attempt_count resets to 1 on a successful sync (see the
  -- edge function), so it only ever counts a *consecutive* run of attempts.
  attempt_count     SMALLINT NOT NULL DEFAULT 0,
  last_attempt_at   TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.academic_imports IS
  'One row per student, scraped server-side from student.srmap.edu.in. Derived, not authoritative. The DOB-password used to obtain it is never stored here or anywhere else.';
COMMENT ON COLUMN public.academic_imports.register_number IS
  'The SRM AP Application/Register Number submitted for the import. Must match the caller''s own public.users.college_id — enforced in the edge function, not here, since that check needs to distinguish "no college_id yet" (claim it) from "mismatch" (reject).';

DROP TRIGGER IF EXISTS trg_academic_imports_touch ON public.academic_imports;
CREATE TRIGGER trg_academic_imports_touch
  BEFORE UPDATE ON public.academic_imports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — owner can read their own row. No write policy for anon/authenticated
-- at all; only the service-role edge function writes here.
-- -----------------------------------------------------------------------------
ALTER TABLE public.academic_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own academic import" ON public.academic_imports;
CREATE POLICY "Users can view their own academic import"
  ON public.academic_imports FOR SELECT
  USING (auth.uid() = user_id);

-- REVOKE FROM PUBLIC alone is insufficient — Supabase default privileges grant
-- to anon and authenticated separately.
REVOKE ALL ON public.academic_imports FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.academic_imports TO authenticated;

-- -----------------------------------------------------------------------------
-- Rate limit. Defense in depth — the edge function is expected to check
-- attempt_count/last_attempt_at itself before ever calling the portal, since
-- it needs that read to decide whether to proceed at all. This trigger is the
-- backstop if that check is ever bypassed or buggy.
--
-- BEFORE UPDATE only: user_id is unique, so a student's first-ever attempt is
-- always an INSERT (nothing to rate-limit yet); every attempt after that is an
-- UPDATE on the existing row, which is what this checks against.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.academic_imports_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.last_attempt_at IS NOT NULL
     AND OLD.last_attempt_at > now() - INTERVAL '15 minutes'
     AND OLD.attempt_count >= 5 THEN
    RAISE EXCEPTION 'Too many import attempts. Try again in a few minutes.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_academic_imports_rate_limit ON public.academic_imports;
CREATE TRIGGER trg_academic_imports_rate_limit
  BEFORE UPDATE ON public.academic_imports
  FOR EACH ROW EXECUTE FUNCTION public.academic_imports_rate_limit();

REVOKE ALL ON FUNCTION public.academic_imports_rate_limit() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Search integration — extend rebuild_mentor_chunks(), don't add a new
-- entity_type. Mentors are the only searchable "person" entity today; a
-- student's coursework only matters for search once they're a mentor others
-- can find.
--
-- Subject NAMES go into `body` (what search actually matches on). cgpa and
-- program go into `metadata` only, never `body` — mirroring the existing rule
-- immediately above this function that mentors.cgpa is "something a student
-- shared to be verified, not to be indexed": a number must not skew semantic
-- similarity, portal-verified or not.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_mentor_chunks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH source AS (
    SELECT
      m.id,
      m.name AS title,
      NULLIF(concat_ws(' · ', m.year_of_studies, m.department), '') AS subtitle,
      concat_ws('. ',
        concat_ws(', ', m.name, m.year_of_studies || ' student', m.department),
        NULLIF('Skills: ' || array_to_string(m.skills, ', '), 'Skills: '),
        NULLIF(m.bio, ''),
        NULLIF('Interests: ' || COALESCE(m.hobbies, ''), 'Interests: '),
        CASE WHEN m.is_alumni THEN concat_ws(' ', 'Alumni', NULLIF('now ' || m.job_title, 'now '), NULLIF('at ' || m.company, 'at ')) END,
        NULLIF('Coursework: ' || (
          SELECT string_agg(DISTINCT subj->>'name', ', ')
          FROM jsonb_array_elements(COALESCE(ai.subjects, '[]'::jsonb)) subj
        ), 'Coursework: ')
      ) AS body,
      jsonb_build_object(
        'department', m.department,
        'skills', to_jsonb(COALESCE(m.skills, ARRAY[]::text[])),
        'profile_image', m.profile_image,
        'year_of_studies', m.year_of_studies,
        'is_alumni', COALESCE(m.is_alumni, false),
        'rating', m.rating,
        'review_count', m.review_count,
        'verified_cgpa', ai.cgpa,
        'verified_program', ai.program
      ) AS metadata,
      '/mentor/' || m.id AS source_path
    FROM public.mentors m
    LEFT JOIN public.academic_imports ai
      ON ai.user_id = m.id AND ai.sync_status = 'success'
    WHERE m.department IS NOT NULL AND m.department <> 'General'
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'mentor', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path,
         md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title       = EXCLUDED.title,
    subtitle    = EXCLUDED.subtitle,
    body        = EXCLUDED.body,
    metadata    = EXCLUDED.metadata,
    visibility  = EXCLUDED.visibility,
    source_path = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    embedding   = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedded_at END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'mentor'
    AND NOT EXISTS (
      SELECT 1 FROM public.mentors m
      WHERE m.id = kc.entity_id AND m.department IS NOT NULL AND m.department <> 'General'
    );

  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_mentor_chunks() FROM PUBLIC, anon, authenticated;

-- An import shouldn't wait for the hourly rebuild_knowledge_chunks() cron to
-- show up in search — reproject immediately, same idiom as
-- trg_opportunities_reproject (20260806220000_opportunity_posting.sql).
CREATE OR REPLACE FUNCTION public.academic_imports_reproject()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  PERFORM public.rebuild_mentor_chunks();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_academic_imports_reproject ON public.academic_imports;
CREATE TRIGGER trg_academic_imports_reproject
  AFTER INSERT OR UPDATE ON public.academic_imports
  FOR EACH STATEMENT EXECUTE FUNCTION public.academic_imports_reproject();

REVOKE ALL ON FUNCTION public.academic_imports_reproject() FROM PUBLIC, anon, authenticated;
