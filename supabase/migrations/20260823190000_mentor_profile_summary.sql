-- =============================================================================
-- mentor profile summary — real columns for the four "skimmable" profile
-- sections that until now had no storage at all.
--
-- WHY THIS EXISTS
-- src/utils/mentor-enhancements.ts read mentor.tagline, mentor.outcomes,
-- mentor.ideal_mentees and mentor.ask_me_anything, and fell back to a template
-- when they were empty. None of the four was ever a column, so every read was
-- undefined and the fallback fired 100% of the time for 100% of mentors. That
-- is why "What I can help you achieve" and "Perfect if you are..." read almost
-- identically on every profile: they were one template with the mentor's skill
-- names substituted in. Same class of bug as the availability_schedule block
-- removed in 20260823170000_mentor_activity_stats.sql.
--
-- The sections stay — a student skimming for "can this person help me?" is
-- exactly what they are for. What changes is that the words now come from the
-- mentor's own material (bio, skills, projects, experiences, coursework),
-- summarised by generate-mentor-summary, and are editable by the mentor.
--
-- GRANTS — READ THIS BEFORE ADDING ANY FURTHER COLUMN HERE
-- public.mentors grants `anon` SELECT column-by-column (23 of 25 columns;
-- cgpa and mobile are deliberately withheld so anonymous visitors cannot
-- harvest phone numbers or read academic standing). Column grants DO NOT
-- extend to columns added later, and PostgREST rejects the whole statement —
-- not just the offending column — with 42501. So the first query naming one of
-- these new columns would 401 the entire public mentor directory. The GRANT at
-- the bottom of this file is load-bearing, not tidiness. `authenticated` holds
-- a table-level grant (20260821230000_grant_audit_fix.sql) and needs nothing.
-- =============================================================================

ALTER TABLE public.mentors
  -- One line under the mentor's name. Was a template string built from
  -- skills.slice(0,3).
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  -- ["Build your first ...", ...] — "What I can help you achieve".
  ADD COLUMN IF NOT EXISTS outcomes JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- ["Beginner looking to ...", ...] — "Perfect if you are...".
  ADD COLUMN IF NOT EXISTS ideal_mentees JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- [{"topic": "PyTorch", "icon": "🤖"}, ...]. The icon is decorative and may
  -- be omitted; the client falls back to an emoji keyed off the topic.
  ADD COLUMN IF NOT EXISTS ask_me_anything JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Provenance. Regeneration is driven off the hash of the source material, in
  -- the same spirit as knowledge_chunks.content_hash: a mentor who has not
  -- touched their profile costs no Gemini quota on the next sweep.
  ADD COLUMN IF NOT EXISTS profile_summary_source_hash  TEXT,
  ADD COLUMN IF NOT EXISTS profile_summary_generated_at TIMESTAMPTZ,
  -- Set when the mentor edits any of the four fields by hand. Generation must
  -- never overwrite a row where this is set — their words outrank ours, and
  -- silently replacing a correction is how you lose a mentor's trust once and
  -- permanently.
  ADD COLUMN IF NOT EXISTS profile_summary_edited_at    TIMESTAMPTZ;

COMMENT ON COLUMN public.mentors.tagline IS
  'One-line summary shown under the mentor name. Generated from the mentor''s own bio/skills by generate-mentor-summary, or written by the mentor. Never templated.';
COMMENT ON COLUMN public.mentors.outcomes IS
  'JSON array of short strings — "What I can help you achieve". Empty array means the section is hidden, never that a placeholder is shown.';
COMMENT ON COLUMN public.mentors.ideal_mentees IS
  'JSON array of short strings — "Perfect if you are...". Empty array hides the section.';
COMMENT ON COLUMN public.mentors.ask_me_anything IS
  'JSON array of {topic, icon} objects. Topics are the mentor''s credible specialities, not simply the first three entries of skills[].';
COMMENT ON COLUMN public.mentors.profile_summary_edited_at IS
  'Non-null once the mentor has hand-edited the summary. generate-mentor-summary skips these rows; a mentor''s own wording is authoritative.';

-- Shape guards. These are cheap and they stop a bad generation (or a bad
-- client) from writing a 40-item list or a paragraph-length "tagline" that
-- would blow out the profile layout.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentors_tagline_len') THEN
    ALTER TABLE public.mentors
      ADD CONSTRAINT mentors_tagline_len
      CHECK (tagline IS NULL OR char_length(tagline) <= 200);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentors_outcomes_shape') THEN
    ALTER TABLE public.mentors
      ADD CONSTRAINT mentors_outcomes_shape
      CHECK (jsonb_typeof(outcomes) = 'array' AND jsonb_array_length(outcomes) <= 6);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentors_ideal_mentees_shape') THEN
    ALTER TABLE public.mentors
      ADD CONSTRAINT mentors_ideal_mentees_shape
      CHECK (jsonb_typeof(ideal_mentees) = 'array' AND jsonb_array_length(ideal_mentees) <= 6);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mentors_ask_me_anything_shape') THEN
    ALTER TABLE public.mentors
      ADD CONSTRAINT mentors_ask_me_anything_shape
      CHECK (jsonb_typeof(ask_me_anything) = 'array' AND jsonb_array_length(ask_me_anything) <= 8);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Source hash — what "the mentor changed something worth regenerating for"
-- means, in one place, so the sweeper and the edge function cannot disagree.
--
-- Deliberately excludes rating, review_count and anything activity-derived: a
-- new review does not change what this person can help with, and rebuilding
-- every summary nightly because ratings drift would burn Gemini quota for no
-- change in output.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mentor_summary_source_hash(
  p_bio         TEXT,
  p_skills      TEXT[],
  p_projects    JSONB,
  p_experiences JSONB,
  p_courses     JSONB,
  p_hobbies     TEXT,
  p_department  TEXT,
  p_year        TEXT,
  p_is_alumni   BOOLEAN,
  p_job_title   TEXT,
  p_company     TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT md5(concat_ws('|',
    coalesce(trim(p_bio), ''),
    coalesce(array_to_string(p_skills, ','), ''),
    coalesce(p_projects::text, '[]'),
    coalesce(p_experiences::text, '[]'),
    coalesce(p_courses::text, '[]'),
    coalesce(trim(p_hobbies), ''),
    coalesce(p_department, ''),
    coalesce(p_year, ''),
    coalesce(p_is_alumni::text, 'false'),
    coalesce(p_job_title, ''),
    coalesce(p_company, '')
  ))
$$;

-- -----------------------------------------------------------------------------
-- Which mentors are worth spending a Gemini call on.
--
-- The threshold is the important part. A mentor with a 20-word bio and a list
-- of skills gives a model nothing to summarise, and asking it to produce four
-- "outcomes" from that input recreates exactly the template this migration
-- exists to delete — only laundered through an LLM, which makes it harder to
-- spot rather than less invented. Below the threshold we generate nothing and
-- the profile shows an honest empty state prompting the mentor to write more.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mentors_needing_summary(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  id          UUID,
  source_hash TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT m.id,
         public.mentor_summary_source_hash(
           m.bio, m.skills, m.projects, m.experiences, m.courses,
           m.hobbies, m.department, m.year_of_studies, m.is_alumni,
           m.job_title, m.company
         ) AS source_hash
  FROM public.mentors m
  WHERE
    -- A hand-edit is final until the mentor themselves clears it.
    m.profile_summary_edited_at IS NULL
    -- Enough real material to summarise without inventing.
    AND (
      char_length(coalesce(trim(m.bio), '')) >= 80
      OR jsonb_array_length(coalesce(m.projects,    '[]'::jsonb)) > 0
      OR jsonb_array_length(coalesce(m.experiences, '[]'::jsonb)) > 0
    )
    -- Never generated, or the source material has moved on since we did.
    AND (
      m.profile_summary_generated_at IS NULL
      OR m.profile_summary_source_hash IS DISTINCT FROM
         public.mentor_summary_source_hash(
           m.bio, m.skills, m.projects, m.experiences, m.courses,
           m.hobbies, m.department, m.year_of_studies, m.is_alumni,
           m.job_title, m.company
         )
    )
  ORDER BY m.profile_summary_generated_at ASC NULLS FIRST
  LIMIT greatest(1, least(p_limit, 200));
$$;

-- Neither function is an API. mentors_needing_summary is called by the
-- generator with the service role; the hash helper is an internal detail.
-- Supabase grants EXECUTE to anon and authenticated by default on new
-- functions, so revoking from PUBLIC alone would not be enough.
REVOKE ALL ON FUNCTION public.mentor_summary_source_hash(
  TEXT, TEXT[], JSONB, JSONB, JSONB, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mentors_needing_summary(INTEGER)
  FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- The load-bearing grant. See the header. Without this the first query naming
-- any of these columns 401s the whole public mentor directory.
--
-- Provenance timestamps are included on purpose: the profile discloses to
-- visitors that a summary was drafted from the mentor's own profile rather
-- than written by them, and an anonymous visitor needs to read that too.
-- profile_summary_source_hash is NOT granted — it is internal bookkeeping.
-- -----------------------------------------------------------------------------
GRANT SELECT (
  tagline,
  outcomes,
  ideal_mentees,
  ask_me_anything,
  profile_summary_generated_at,
  profile_summary_edited_at
) ON public.mentors TO anon;
