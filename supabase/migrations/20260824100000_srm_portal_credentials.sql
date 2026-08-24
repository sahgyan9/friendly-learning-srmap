-- =============================================================================
-- srm_portal_credentials — an encrypted-at-rest DOB (the SRM AP student
-- portal's actual login password) for mentors who opted into background sync,
-- so a scheduled job can refresh their CGPA/semester/coursework/mobile number
-- without a human present to solve a captcha each time.
--
-- This reverses a deliberate earlier decision (see the header comments on
-- academic_imports and academic_refresh_reminder) to never store this value,
-- because it is a live credential to a third-party account we do not run.
-- Storing it at all is an accepted, explicit risk (Gyan chose "proceed
-- anyway, encrypted" after being walked through the alternative). What this
-- table does to bound that risk:
--
--   - The ciphertext here is useless without SRM_DOB_ENCRYPTION_KEY, a
--     Supabase Function secret that lives ONLY in edge-function runtime
--     config -- never in this database, never in Vault (Vault's one existing
--     secret, sync_faculty_cron_secret, is a transport secret proving "this
--     request came from our own cron," and must not double as a credential
--     key: anyone able to `SELECT * FROM vault.decrypted_secrets` would
--     otherwise be able to decrypt every mentor's DOB). A Postgres-level
--     breach (leaked service-role key, SQL injection, a stolen DB dump)
--     therefore yields ciphertext only -- it does NOT defend against
--     Supabase-project-admin-level compromise, since dashboard access
--     exposes function secrets too.
--   - encrypt-then-store happens only in import-srm-portal's step:"link"
--     path, immediately after a real portal login has already proven the DOB
--     correct -- there is no code path whose sole purpose is receiving a
--     plaintext DOB for storage.
--   - decrypt happens only in sync-srm-portal, immediately before building
--     the login POST, and the plaintext is discarded within that request.
--
-- Stricter RLS than academic_imports: no SELECT policy at all, not even for
-- the owning user. A credential table has no legitimate client read path --
-- public.users.date_of_birth_linked is the client-visible signal instead.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.srm_portal_credentials (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,

  -- Duplicated from users.college_id (not looked up through it) so the login
  -- identity and the credential travel together and can't drift if college_id
  -- is edited after linking.
  register_number       TEXT NOT NULL,

  -- AES-256-GCM. dob_iv is a fresh 12-byte nonce per encryption, never reused
  -- under the same key. Associated data at encrypt/decrypt time is the row's
  -- own user_id, binding a ciphertext to its row so one can't be swapped into
  -- another and silently "succeed" -- the auth tag fails to verify.
  dob_ciphertext        TEXT NOT NULL,
  dob_iv                TEXT NOT NULL,
  -- Bumped on a future key rotation, so old rows can be decrypted with the
  -- old key and re-encrypted with the new one as a background pass rather
  -- than a flag day. Not used yet.
  encryption_version    SMALLINT NOT NULL DEFAULT 1,

  -- Unattended-login failure tracking. Reset to 0 on every success; once it
  -- reaches the sync function's threshold, the row is deleted and
  -- users.date_of_birth_linked flips back to false (see sync-srm-portal) --
  -- there is no reason to keep holding an encrypted credential that has
  -- proven it doesn't work.
  consecutive_failures  SMALLINT NOT NULL DEFAULT 0,
  last_attempt_at       TIMESTAMPTZ,
  last_success_at       TIMESTAMPTZ,
  last_error            TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.srm_portal_credentials IS
  'Encrypted-at-rest DOB (SRM portal password) for mentors who opted into background sync. Ciphertext only -- the AES-GCM key lives solely in the SRM_DOB_ENCRYPTION_KEY edge function secret, never in Postgres or Vault, so a database dump alone cannot decrypt any row. Service-role access only; no SELECT policy exists even for the owning user.';

DROP TRIGGER IF EXISTS trg_srm_portal_credentials_touch ON public.srm_portal_credentials;
CREATE TRIGGER trg_srm_portal_credentials_touch
  BEFORE UPDATE ON public.srm_portal_credentials
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- RLS — nobody but service_role. Not even owner SELECT: enabling RLS with
-- zero policies denies every row to anon/authenticated even if a future GRANT
-- is added by mistake; service_role bypasses RLS by default so needs none.
-- -----------------------------------------------------------------------------
ALTER TABLE public.srm_portal_credentials ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.srm_portal_credentials FROM PUBLIC, anon, authenticated;
