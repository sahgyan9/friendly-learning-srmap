-- Client-visible signal for whether a mentor has linked their SRM portal
-- (i.e. a live row exists in srm_portal_credentials). The client never reads
-- srm_portal_credentials itself (no policy grants that), so this boolean is
-- what the nag/profile UI actually checks.
--
-- Only ever written by service-role edge functions: import-srm-portal sets it
-- true right after a successful step:"link"; sync-srm-portal sets it false
-- after repeated unattended-login failures, which re-arms the nag. It must
-- NOT be client-writable, or a user could silence the nag without actually
-- linking.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS date_of_birth_linked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.date_of_birth_linked IS
  'True once a mentor has successfully linked their SRM portal (DOB encrypted into srm_portal_credentials). Flipped back to false by sync-srm-portal after repeated unattended-login failures. Client-writable only via the trigger guard below -- see it for why a client cannot set this directly.';

-- Guarded with a BEFORE UPDATE trigger, NOT a WITH-CHECK-subquery addition to
-- the existing "excluding admin status" policy (deliberately not touched
-- here). That policy's WITH CHECK compares the incoming value against a
-- self-referential `SELECT ... FROM public.users WHERE id = auth.uid()` --
-- verified against this table's harness that a subquery of that shape sees
-- the row's PROPOSED new value, not its prior one, so the comparison is
-- always true and blocks nothing. (This appears to affect the existing
-- is_admin clause the same way -- flagged separately, not fixed here, since
-- that is a pre-existing issue out of scope for this migration.) A trigger
-- reading OLD/NEW does not have this ambiguity: OLD is unambiguously the row
-- before this statement, supplied directly by the executor.
--
-- current_user = 'service_role' is the correct test for "this write came from
-- an edge function using the service role key", which is the Postgres role
-- Supabase's API layer executes as for service-role-authenticated requests
-- (and the role that bypasses RLS) -- distinct from checking auth.uid(),
-- which reflects the JWT's subject rather than which Postgres role is asking.
CREATE OR REPLACE FUNCTION public.guard_date_of_birth_linked()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_temp
AS $$
BEGIN
  IF NEW.date_of_birth_linked IS DISTINCT FROM OLD.date_of_birth_linked
     AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'date_of_birth_linked can only be changed by the SRM portal sync service'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_date_of_birth_linked ON public.users;
CREATE TRIGGER trg_guard_date_of_birth_linked
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_date_of_birth_linked();

REVOKE ALL ON FUNCTION public.guard_date_of_birth_linked() FROM PUBLIC, anon, authenticated;
