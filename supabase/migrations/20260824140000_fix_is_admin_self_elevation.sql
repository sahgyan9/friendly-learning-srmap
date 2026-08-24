-- =============================================================================
-- Fixes a real privilege-escalation bug: any signed-in user could set their
-- own is_admin to true.
--
-- 20250815121408_...sql added a policy meant to stop this -- "Users can
-- update their own profile (excluding admin status)" -- whose WITH CHECK
-- compares the incoming value against a self-referential subquery:
--   is_admin = COALESCE((SELECT is_admin FROM public.users WHERE id = auth.uid()), false)
-- Verified against a real Postgres instance (this repo's PGlite test harness)
-- that this subquery sees the row's PROPOSED new value at check time, not its
-- value before the statement -- so the comparison is always true and the
-- policy blocks nothing. A direct
--   supabase.from('users').update({ is_admin: true }).eq('id', user.id)
-- call from any signed-in client succeeds today.
--
-- That policy is deliberately left in place (removing it buys nothing, and
-- it is otherwise harmless) -- this migration adds the real enforcement via a
-- BEFORE UPDATE trigger instead, the same fix already applied to
-- date_of_birth_linked in 20260824110000_date_of_birth_linked_flag.sql. A
-- trigger reading OLD/NEW does not have the self-referential-subquery
-- ambiguity: OLD is unambiguously the row before this statement, supplied
-- directly by the executor.
--
-- Unlike date_of_birth_linked (which only service-role edge functions ever
-- write), is_admin has a legitimate second writer: public.set_user_admin_status,
-- a SECURITY DEFINER RPC that already re-checks the caller is an admin before
-- writing, and which executes its internal UPDATE as the function's OWNER
-- role, not as 'authenticated'. So this trigger blocks by role NAME
-- ('anon'/'authenticated' -- the two roles PostgREST assigns to a direct
-- client call based on the request's JWT), rather than allow-listing a single
-- role: that keeps the RPC, any current or future service-role writer, and a
-- superuser SQL-editor session all working, while a direct client mutation is
-- rejected regardless of which policy would otherwise have let it through.
CREATE OR REPLACE FUNCTION public.guard_users_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_temp
AS $$
BEGIN
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'is_admin cannot be changed directly -- use set_user_admin_status()'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_users_is_admin ON public.users;
CREATE TRIGGER trg_guard_users_is_admin
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_is_admin();

REVOKE ALL ON FUNCTION public.guard_users_is_admin() FROM PUBLIC, anon, authenticated;
