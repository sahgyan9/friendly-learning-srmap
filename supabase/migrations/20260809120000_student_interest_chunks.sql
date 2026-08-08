-- Student interests: opt-in discoverability for plain (non-mentor) students.
--
-- A student who lists interests AND flips interests_discoverable appears in
-- CampusMind search results — for signed-in viewers only. This is the first
-- entity type in the index representing people who never applied for anything,
-- so the privacy posture is stricter than mentors/faculty:
--
--   * Chunks are always visibility='signed_in'. search_knowledge() returns
--     those only when p_viewer IS NOT NULL, so a signed-out caller
--     structurally cannot receive a student row. The gate lives in SQL, not
--     in the edge function.
--   * Opt-in is default-false, and opting out (or emptying interests) deletes
--     the chunk in the same statement via the per-row trigger below.
--   * Mentors are excluded: mentors.id = users.id in this schema, and mentors
--     already project *public* chunks via rebuild_mentor_chunks(). Indexing
--     both would duplicate every mentor under two entity types.
--
-- Per-row reprojection (like posts, unlike opportunities): users is the
-- biggest people table and grows without a ceiling, so a full-table rebuild
-- per profile edit would eventually scan every user on every toggle.
-- Name/bio edits are picked up by the hourly rebuild-knowledge-chunks cron;
-- only interests/interests_discoverable changes need immediacy, so the
-- trigger fires only on those columns.
--
-- APPLIED TO PRODUCTION 2026-08-09 via MCP apply_migration after a full
-- BEGIN/ROLLBACK dress rehearsal (DDL + trigger fire + opt-out delete +
-- privacy assertion, all rolled back). This file cannot run in the PGlite
-- harness: knowledge_chunks is pgvector-backed — see the SKIP list in
-- supabase/tests/verify-migrations.mjs.

ALTER TABLE public.users
  ADD COLUMN interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN interests_discoverable boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.rebuild_student_chunks(p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE affected INTEGER;
BEGIN
  WITH source AS (
    SELECT u.id,
      u.name AS title,
      NULLIF(concat_ws(' · ', u.department,
        CASE WHEN u.graduation_year IS NOT NULL THEN 'Class of ' || u.graduation_year END), '') AS subtitle,
      concat_ws('. ',
        concat_ws(', ', u.name, u.department),
        NULLIF('Interested in: ' || array_to_string(u.interests, ', '), 'Interested in: '),
        NULLIF('Skills: ' || array_to_string(COALESCE(u.skills, ARRAY[]::text[]), ', '), 'Skills: '),
        NULLIF(u.bio, '')
      ) AS body,
      jsonb_build_object(
        'department', u.department,
        'interests', to_jsonb(u.interests),
        'profile_image', u.profile_image,
        'graduation_year', u.graduation_year
      ) AS metadata
    FROM public.users u
    WHERE u.interests_discoverable
      AND cardinality(u.interests) > 0
      AND (p_user_id IS NULL OR u.id = p_user_id)
      AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = u.id)
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'student', s.id, s.title, s.subtitle, s.body, s.metadata, 'signed_in', NULL, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    body = EXCLUDED.body,
    metadata = EXCLUDED.metadata,
    visibility = EXCLUDED.visibility,
    source_path = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    embedding = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                     THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                       THEN NULL ELSE public.knowledge_chunks.embedded_at END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'student'
    AND (p_user_id IS NULL OR kc.entity_id = p_user_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = kc.entity_id
        AND u.interests_discoverable
        AND cardinality(u.interests) > 0
        AND NOT EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = u.id)
    );

  RETURN affected;
END; $fn$;

REVOKE ALL ON FUNCTION public.rebuild_student_chunks(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.users_reproject_student_chunk()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
BEGIN
  PERFORM public.rebuild_student_chunks(NEW.id);
  RETURN NEW;
END; $fn$;

REVOKE ALL ON FUNCTION public.users_reproject_student_chunk() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER users_student_chunk_reproject
AFTER UPDATE OF interests, interests_discoverable ON public.users
FOR EACH ROW
WHEN (OLD.interests IS DISTINCT FROM NEW.interests
   OR OLD.interests_discoverable IS DISTINCT FROM NEW.interests_discoverable)
EXECUTE FUNCTION public.users_reproject_student_chunk();

CREATE OR REPLACE FUNCTION public.rebuild_knowledge_chunks()
RETURNS TABLE(entity_type text, rows_upserted integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
BEGIN
  RETURN QUERY SELECT 'faculty'::TEXT,     public.rebuild_faculty_chunks();
  RETURN QUERY SELECT 'mentor'::TEXT,      public.rebuild_mentor_chunks();
  RETURN QUERY SELECT 'opportunity'::TEXT, public.rebuild_opportunity_chunks();
  RETURN QUERY SELECT 'community'::TEXT,   public.rebuild_community_chunks();
  RETURN QUERY SELECT 'post'::TEXT,        public.rebuild_post_chunks();
  RETURN QUERY SELECT 'student'::TEXT,     public.rebuild_student_chunks();
END; $fn$;
