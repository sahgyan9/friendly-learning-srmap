-- =============================================================================
-- Restore public.set_user_admin_status and the is_admin self-elevation guard.
--
-- Found 2026-09-14: production has no set_user_admin_status. PostgREST returns
-- PGRST202 "could not find the function" for it, it is absent from
-- `supabase gen types --linked`, and pg_proc has no row for it. The admin
-- "promote / revoke admin" controls in src/integrations/supabase/services/admin.ts
-- call it, so they have been failing in production.
--
-- 20260820120000 (the RPC) evidently never reached production, so this
-- migration re-applies it verbatim, together with 20260824140000 (the
-- BEFORE UPDATE trigger that stops a signed-in user setting their own
-- is_admin = true), whose presence in production could not be confirmed from
-- outside the database. Both halves are idempotent: CREATE OR REPLACE, and
-- DROP TRIGGER IF EXISTS before CREATE TRIGGER. Re-running on a database that
-- already has them changes nothing.
-- =============================================================================

-- ---- from 20260820120000_set_user_admin_status_rpc.sql ----

CREATE OR REPLACE FUNCTION public.set_user_admin_status(
  p_target_user_id UUID,
  p_is_admin BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_updated_id UUID;
  v_updated_name TEXT;
  v_updated_email TEXT;
  v_updated_is_admin BOOLEAN;
BEGIN
  v_caller_id := auth.uid();

  -- Caller must be authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Caller must be an admin
  IF NOT public.is_admin_user(v_caller_id) THEN
    RAISE EXCEPTION 'Only administrators can modify admin status' USING ERRCODE = '42501';
  END IF;

  -- Target user cannot be null
  IF p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user ID cannot be null' USING ERRCODE = '22004';
  END IF;

  -- Update target user
  UPDATE public.users
  SET is_admin = p_is_admin
  WHERE id = p_target_user_id
  RETURNING id, name, email, is_admin 
  INTO v_updated_id, v_updated_name, v_updated_email, v_updated_is_admin;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'User % not found', p_target_user_id USING ERRCODE = 'P0002';
  END IF;

  -- Log action in audit log if table exists
  BEGIN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action_type,
      target_user_id,
      action_details
    ) VALUES (
      v_caller_id,
      CASE WHEN p_is_admin THEN 'promote_user_to_admin' ELSE 'revoke_admin_privileges' END,
      p_target_user_id,
      jsonb_build_object(
        'target_user_id', p_target_user_id,
        'is_admin', p_is_admin,
        'updated_at', now()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Continue if audit log table is missing or transient failure occurs
    NULL;
  END;

  RETURN jsonb_build_object(
    'id', v_updated_id,
    'name', v_updated_name,
    'email', v_updated_email,
    'is_admin', v_updated_is_admin
  );
END;
$$;

-- Revoke from public/anon, grant to authenticated
REVOKE ALL ON FUNCTION public.set_user_admin_status(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_admin_status(UUID, BOOLEAN) TO authenticated;

-- ---- from 20260824140000_fix_is_admin_self_elevation.sql ----

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
