-- =============================================================================
-- Admin preview of unpublished campus notices
--
-- 20260821110000_campus_notices.sql only granted SELECT on *published*
-- notices. The admin-facing /notices/:id page (built to preview a draft
-- before publishing) relies on an admin being able to read an unpublished
-- row too — without this, the page silently renders "Notice not found" for
-- any draft, even to an admin, because RLS filters the row out before it
-- ever reaches the client. Postgres unions multiple permissive SELECT
-- policies with OR, so adding this alongside the existing "published to
-- everyone" policy is additive, not a replacement.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'campus_notices'
      AND policyname = 'Admins can view unpublished campus notices'
  ) THEN
    CREATE POLICY "Admins can view unpublished campus notices"
      ON public.campus_notices
      FOR SELECT
      TO authenticated
      USING (public.is_admin_user(auth.uid()));
  END IF;
END $$;
