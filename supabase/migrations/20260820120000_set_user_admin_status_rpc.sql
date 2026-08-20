-- =============================================================================
-- Admin Role Management RPC
--
-- Provides public.set_user_admin_status(p_target_user_id, p_is_admin) to safely
-- grant or revoke admin status without requiring client-side RLS table mutations.
-- =============================================================================

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
