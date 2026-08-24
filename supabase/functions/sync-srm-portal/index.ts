// Unattended background refresh of linked mentors' SRM portal data (CGPA,
// semester, coursework, mobile number). Logs in WITHOUT a human confirming
// the captcha — this is the accepted-risk half of the feature described in
// srm_portal_credentials' migration comment. Read that comment before
// touching this file: it explains why this was rejected once already, and
// what specifically bounds the risk this time (encrypted-at-rest DOB, a
// low daily cadence, a small rotating batch, and a low failure threshold
// that unlinks and re-arms the nag rather than hammering a broken account).
//
// HARD RULE, inherited from srm-portal.ts: never log a decrypted DOB or any
// portal response body — only classified error messages.
//
// Invoke:
//   POST /functions/v1/sync-srm-portal   (admin JWT, or CRON_SECRET header)
//
// Scheduled by the pg_cron job `srm-portal-sync`: 30 21 * * * (UTC) = 03:00
// IST, once every 24 hours. See that migration for why daily is already more
// than the underlying data warrants.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import {
  doLogin,
  fetchAcademicSections,
  fetchLoginPageAndCaptcha,
  parseProfile,
  parseTranscript,
  recognizeCaptcha,
} from "../_shared/srm-portal.ts";
import { decryptDob } from "../_shared/dob-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const CRON_SECRET = Deno.env.get("CRON_SECRET");
const admin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

/** Rows per run. See the cron migration comment for why 25/day is enough to
 * cycle the whole linked-mentor population without ever bursting. */
const BATCH_SIZE = 25;
/** Don't re-attempt a mentor within this window even if they're at the front
 * of the queue — guards against a fast manual re-trigger during testing
 * turning into back-to-back unattended logins for the same account. */
const MIN_REATTEMPT_INTERVAL_MS = 12 * 60 * 60 * 1000;
/** Delay between each mentor's login attempt within a batch, so this never
 * bursts several simultaneous logins against the same third-party site from
 * one egress IP — exactly the pattern a portal-side rate-limiter would flag. */
const INTER_ATTEMPT_DELAY_MS = 4000;
/** Consecutive failures before a credential is treated as broken: tolerant
 * enough to absorb one transient portal hiccup or bad OCR guess across
 * separate runs (only one attempt per mentor per run), low enough that a
 * genuinely broken link doesn't keep hammering the account. */
const FAILURE_THRESHOLD = 3;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function isAuthorised(req: Request): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (CRON_SECRET && secret === CRON_SECRET) return true;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const { data, error } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data?.user) return false;

  const { data: profile } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile?.is_admin === true;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CredentialRow {
  user_id: string;
  register_number: string;
  dob_ciphertext: string;
  dob_iv: string;
  consecutive_failures: number;
}

async function unlinkAndNotify(userId: string, reason: string) {
  await admin.from("srm_portal_credentials").delete().eq("user_id", userId);
  await admin.from("users").update({ date_of_birth_linked: false }).eq("id", userId);
  await admin.from("email_queue").insert({ recipient_id: userId, kind: "srm_relink_needed" });
  console.log(`Unlinked user ${userId} after repeated sync failures: ${reason}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await isAuthorised(req))) {
    return json({ error: "Unauthorized" }, 401);
  }

  const cutoff = new Date(Date.now() - MIN_REATTEMPT_INTERVAL_MS).toISOString();

  const { data: batch, error: batchError } = await admin
    .from("srm_portal_credentials")
    .select("user_id, register_number, dob_ciphertext, dob_iv, consecutive_failures, users!inner(date_of_birth_linked)")
    .eq("users.date_of_birth_linked", true)
    .or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`)
    .order("last_attempt_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (batchError) return json({ error: batchError.message }, 500);

  let succeeded = 0;
  let failed = 0;
  let unlinked = 0;

  for (const row of (batch ?? []) as unknown as CredentialRow[]) {
    if (succeeded + failed > 0) await sleep(INTER_ATTEMPT_DELAY_MS);

    const nowIso = new Date().toISOString();

    try {
      let dobPassword: string;
      try {
        dobPassword = await decryptDob(row.dob_ciphertext, row.dob_iv, row.user_id);
      } catch (decryptError) {
        console.error(`Decrypt failed for user ${row.user_id} (non-fatal, row skipped):`, decryptError instanceof Error ? decryptError.message : decryptError);
        failed += 1;
        const failures = row.consecutive_failures + 1;
        if (failures >= FAILURE_THRESHOLD) {
          await unlinkAndNotify(row.user_id, "decrypt failure");
          unlinked += 1;
        } else {
          await admin.from("srm_portal_credentials").update({
            consecutive_failures: failures,
            last_attempt_at: nowIso,
            last_error: "Could not decrypt stored credential.",
          }).eq("user_id", row.user_id);
        }
        continue;
      }

      const { jar, imageBytes } = await fetchLoginPageAndCaptcha();
      const { guess } = await recognizeCaptcha(imageBytes);

      if (!guess) {
        // Unreadable captcha — not worth guessing blindly. Free to retry next
        // run; does not count against the failure threshold since this isn't
        // evidence the credential itself is broken.
        await admin.from("srm_portal_credentials").update({
          last_attempt_at: nowIso,
          last_error: "Captcha image unreadable this run.",
        }).eq("user_id", row.user_id);
        continue;
      }

      const loginResult = await doLogin(jar, row.register_number, dobPassword, guess);

      if (!loginResult.loggedIn) {
        failed += 1;
        const failures = row.consecutive_failures + 1;
        if (failures >= FAILURE_THRESHOLD) {
          await unlinkAndNotify(row.user_id, loginResult.errorMessage ?? "login failed");
          unlinked += 1;
        } else {
          await admin.from("srm_portal_credentials").update({
            consecutive_failures: failures,
            last_attempt_at: nowIso,
            last_error: loginResult.errorMessage ?? "Unattended login failed.",
          }).eq("user_id", row.user_id);
        }
        continue;
      }

      const { profileHtml, transcriptHtml } = await fetchAcademicSections(loginResult.jar);
      const { program, currentSemester, mobileNumber } = parseProfile(profileHtml);
      const { cgpa, subjects } = parseTranscript(transcriptHtml);

      await admin.from("academic_imports").upsert({
        user_id: row.user_id,
        register_number: row.register_number,
        program,
        current_semester: currentSemester,
        subjects,
        cgpa,
        mobile_number: mobileNumber,
        sync_status: "success",
        last_error: null,
        last_synced_at: nowIso,
        last_attempt_at: nowIso,
      }, { onConflict: "user_id" });

      await admin.from("srm_portal_credentials").update({
        consecutive_failures: 0,
        last_success_at: nowIso,
        last_attempt_at: nowIso,
        last_error: null,
      }).eq("user_id", row.user_id);

      succeeded += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unexpected error during sync.";
      console.error(`sync-srm-portal row failed for user ${row.user_id}:`, message);
      const failures = row.consecutive_failures + 1;
      if (failures >= FAILURE_THRESHOLD) {
        await unlinkAndNotify(row.user_id, message);
        unlinked += 1;
      } else {
        await admin.from("srm_portal_credentials").update({
          consecutive_failures: failures,
          last_attempt_at: nowIso,
          last_error: "Unexpected error during unattended sync.",
        }).eq("user_id", row.user_id);
      }
    }
  }

  return json({ processed: (batch ?? []).length, succeeded, failed, unlinked });
});
