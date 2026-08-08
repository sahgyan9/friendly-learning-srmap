-- Admin health panel: one SECURITY DEFINER RPC, admin-gated in code.
--
-- users is owner-only, so the is_admin check runs as definer against the
-- caller's auth.uid(). Granted to authenticated (the gate rejects
-- non-admins with 42501); revoked from PUBLIC and anon entirely.
-- Function-log error counts are not SQL-reachable, so the panel reads
-- cron failure counts instead — the closest data the database itself has.
--
-- APPLIED TO PRODUCTION 2026-08-09 via MCP apply_migration after a
-- BEGIN/ROLLBACK rehearsal asserting (a) a caller with no auth.uid() gets
-- 42501, never data, and (b) the metrics jsonb builds non-NULL. Cannot run
-- in the PGlite harness: reads cron.job_run_details (the stub cron schema
-- has no run history) and counts rows of the pgvector-backed
-- knowledge_chunks — see the SKIP list in verify-migrations.mjs.

CREATE OR REPLACE FUNCTION public.admin_health_metrics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE v_is_admin boolean; result jsonb;
BEGIN
  SELECT u.is_admin INTO v_is_admin FROM public.users u WHERE u.id = auth.uid();
  IF v_is_admin IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'email_stuck_1h', (SELECT count(*) FROM public.email_queue
                        WHERE sent_at IS NULL AND created_at < now() - interval '1 hour'),
    'email_errors_24h', (SELECT count(*) FROM public.email_queue
                          WHERE last_error IS NOT NULL AND created_at > now() - interval '24 hours'),
    'embedding_backlog', (SELECT count(*) FROM public.knowledge_chunks WHERE embedding IS NULL),
    'chunks_total', (SELECT count(*) FROM public.knowledge_chunks),
    'rebuild_last_success', (SELECT max(end_time) FROM cron.job_run_details d
                              JOIN cron.job j ON j.jobid = d.jobid
                              WHERE j.jobname = 'rebuild-knowledge-chunks-hourly' AND d.status = 'succeeded'),
    'embed_last_success', (SELECT max(end_time) FROM cron.job_run_details d
                            JOIN cron.job j ON j.jobid = d.jobid
                            WHERE j.jobname = 'embed-knowledge-topup' AND d.status = 'succeeded'),
    'cron_failures_24h', (SELECT count(*) FROM cron.job_run_details d
                           WHERE d.status = 'failed' AND d.start_time > now() - interval '24 hours'),
    'generated_at', now()
  ) INTO result;

  RETURN result;
END; $fn$;

REVOKE ALL ON FUNCTION public.admin_health_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_health_metrics() TO authenticated;
