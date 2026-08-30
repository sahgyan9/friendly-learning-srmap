-- =============================================================================
-- Error Reports ("Report to admin" on error toasts)
--
-- Every error toast in the app can now be flagged to an admin in one click.
-- Reporting must work even when nobody is signed in (a failed sign-in is one
-- of the most useful errors to hear about), so INSERT is open to anon too --
-- same shape as public.contact_messages. user_id is taken from auth.uid()
-- server-side rather than trusted from the client, so a caller cannot claim
-- someone else's report.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  message TEXT NOT NULL,
  route TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_reports_status_created ON public.error_reports (status, created_at DESC);

ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can report an error" ON public.error_reports;
CREATE POLICY "Anyone can report an error"
  ON public.error_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view error reports" ON public.error_reports;
CREATE POLICY "Admins can view error reports"
  ON public.error_reports FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "Admins can update error reports" ON public.error_reports;
CREATE POLICY "Admins can update error reports"
  ON public.error_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

-- Default privileges grant ALL on a new table to anon/authenticated; pin down
-- exactly what each role gets instead of relying on RLS alone to hide it.
REVOKE ALL ON public.error_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT ON public.error_reports TO anon, authenticated;
GRANT SELECT, UPDATE ON public.error_reports TO authenticated;

-- -----------------------------------------------------------------------------
-- Notify every admin in-app the moment a report comes in, the same way
-- notify_admin_contact_message() already does for the contact form.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_admin_error_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  FOR admin_user IN
    SELECT id FROM public.users WHERE is_admin = true
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content, data)
    VALUES (
      admin_user.id,
      'system',
      'Error reported',
      COALESCE(NEW.route, 'A page') || ': ' || left(NEW.message, 140),
      jsonb_build_object(
        'error_report_id', NEW.id,
        'route', NEW.route,
        'message', NEW.message
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_admin_error_report ON public.error_reports;
CREATE TRIGGER trigger_notify_admin_error_report
  AFTER INSERT ON public.error_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_error_report();
