// Human-supervised sign-in to the SRM AP student portal
// (student.srmap.edu.in — a third-party site we do not run and have no
// special access to; this replicates the same plain login form any student
// uses).
//
// HARD RULE: the portal password (the student's DOB) is used only to build
// the single login POST body. It must never be logged, thrown in an Error, or
// written to any table in plaintext — not even on failure. If you are adding
// error handling here, do not include the raw portal response body in it; the
// portal's failure page does not echo submitted values back (verified), but
// treat that as defense in depth, not a license to log it anyway.
//
// Three steps:
//   step "captcha": fetch the login page + captcha image, return them to the
//     browser. No login is attempted here. An OCR guess may be attached, but
//     it is advisory only — the student confirms or corrects it before the
//     next step, because a wrong captcha guess is a real login attempt
//     against the student's actual SRM account (same as a wrong password),
//     and the portal's lockout policy is unknown. See the migration comment
//     on academic_imports.attempt_count for the throttle this backstops.
//   step "login": submits the confirmed captcha + credentials, once, and
//     saves the resulting academic snapshot. Does NOT persist the DOB.
//   step "link": identical to "login", but additionally encrypts the DOB
//     (AES-256-GCM, see _shared/dob-crypto.ts) and upserts it into
//     srm_portal_credentials so sync-srm-portal can refresh this mentor's
//     data later without a human present. This is the mentor-only,
//     explicitly-accepted-risk path — see that table's migration comment for
//     the full reasoning. Every mentor-facing UI entry point uses this step,
//     not "login"; "login" is kept only so existing callers of that contract
//     shape keep working.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import {
  COLLEGE_ID_FORMAT,
  decodeSessionToken,
  doLogin,
  encodeSessionToken,
  fetchAcademicSections,
  fetchLoginPageAndCaptcha,
  parseAttendance,
  parseCourseList,
  parseProfile,
  parseTranscript,
  recognizeCaptcha,
} from "../_shared/srm-portal.ts";
import { encryptDob } from "../_shared/dob-crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --- handler -----------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));

    // --- step 1: fetch login page + captcha, no login attempted ------------
    if (body.step === "captcha") {
      const { jar, imageBytes, contentType } = await fetchLoginPageAndCaptcha();

      let binary = "";
      for (const byte of imageBytes) binary += String.fromCharCode(byte);
      const imageDataUrl = `data:${contentType};base64,${btoa(binary)}`;

      const { guess, confidence } = await recognizeCaptcha(imageBytes);

      return json({
        data: {
          sessionToken: encodeSessionToken(jar),
          imageDataUrl,
          guess,
          confidence,
        },
      });
    }

    // --- step 2/3: confirmed captcha + credentials, one real login attempt ---
    if (body.step === "login" || body.step === "link") {
      const isLink = body.step === "link";
      const { sessionToken, registerNumber, dobPassword, captcha } = body;
      if (!sessionToken || !registerNumber || !dobPassword || !captcha) {
        return json({ error: "Missing required fields." }, 400);
      }
      if (!COLLEGE_ID_FORMAT.test(registerNumber)) {
        return json({ error: "That doesn't look like a valid SRM AP register number (e.g. AP23111260062)." }, 400);
      }

      // Bind to the caller's own identity — reject an attempt to import under
      // someone else's register number, claim it (first-write-wins) if the
      // caller has none on file yet.
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("college_id")
        .eq("id", userId)
        .single();
      if (profile?.college_id && profile.college_id !== registerNumber) {
        return json({ error: "This register number doesn't match the one linked to your account." }, 403);
      }

      // Rate limit — read-before-write, ahead of ever calling the portal.
      // The DB trigger (academic_imports_rate_limit) is the backstop if this
      // check is ever bypassed.
      const { data: existing } = await supabaseAdmin
        .from("academic_imports")
        .select("attempt_count, last_attempt_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (
        existing?.last_attempt_at &&
        existing.attempt_count >= 5 &&
        Date.now() - new Date(existing.last_attempt_at).getTime() < 15 * 60 * 1000
      ) {
        return json({ error: "Too many import attempts. Try again in a few minutes." }, 429);
      }

      let jar;
      try {
        jar = decodeSessionToken(sessionToken);
      } catch {
        return json({ error: "That session expired — request a new captcha and try again." }, 400);
      }

      // NOTE: deliberately never reading/logging the login response body on
      // failure beyond the classified errorMessage doLogin returns.
      const loginResult = await doLogin(jar, registerNumber, dobPassword, captcha);

      const attemptCount = (existing?.attempt_count ?? 0) + 1;
      const nowIso = new Date().toISOString();

      if (!loginResult.loggedIn) {
        const errorMessage = loginResult.errorMessage ?? "Couldn't sign in — check your register number, password, and try again.";

        await supabaseAdmin.from("academic_imports").upsert({
          user_id: userId,
          register_number: registerNumber,
          sync_status: "failed",
          last_error: errorMessage,
          attempt_count: attemptCount,
          last_attempt_at: nowIso,
        }, { onConflict: "user_id" });

        return json({ error: errorMessage }, 401);
      }

      jar = loginResult.jar;

      const { profileHtml, courseListHtml, transcriptHtml, attendanceHtml } = await fetchAcademicSections(jar);
      const { program, currentSemester, mobileNumber } = parseProfile(profileHtml);
      const courseMap = parseCourseList(courseListHtml);
      const { cgpa, subjects } = parseTranscript(transcriptHtml);
      const attendanceCourses = parseAttendance(attendanceHtml, courseMap);

      await supabaseAdmin.from("academic_imports").upsert({
        user_id: userId,
        register_number: registerNumber,
        program,
        current_semester: currentSemester,
        subjects,
        cgpa,
        mobile_number: mobileNumber,
        sync_status: "success",
        last_error: null,
        last_synced_at: nowIso,
        attempt_count: 1, // resets on success — only a *consecutive* run of failures throttles
        last_attempt_at: nowIso,
      }, { onConflict: "user_id" });

      for (const course of attendanceCourses) {
        await supabaseAdmin.from("student_attendance").upsert({
          user_id: userId,
          register_number: registerNumber,
          course_code: course.courseCode,
          course_name: course.courseName,
          slot: course.slot || null,
          faculty_name: course.facultyName || null,
          conducted_hours: course.conductedHours,
          attended_hours: course.attendedHours,
          absent_hours: course.absentHours,
          attendance_percentage: course.attendancePercentage,
          classes_needed: course.classesNeeded,
          safe_bunks: course.safeBunks,
          last_synced_at: nowIso,
        }, { onConflict: "user_id,course_code" });

        // Trigger immediate Alert if < 75%
        if (course.attendancePercentage < 75.0 && course.conductedHours > 0) {
          const alertTitle = `⚠️ Attendance Alert: ${course.courseCode} (${course.attendancePercentage}%)`;
          const alertMessage = `Your attendance in ${course.courseName} is ${course.attendancePercentage}%. You need to attend the next ${course.classesNeeded} consecutive class(es) to reach 75%.`;

          await supabaseAdmin.from("notifications").insert({
            user_id: userId,
            type: "attendance_alert",
            title: alertTitle,
            content: alertMessage,
            data: {
              course_code: course.courseCode,
              course_name: course.courseName,
              attendance_percentage: course.attendancePercentage,
              classes_needed: course.classesNeeded,
              conducted_hours: course.conductedHours,
              attended_hours: course.attendedHours,
              url: "/attendance",
            },
            read: false,
          });

          try {
            await supabaseAdmin.functions.invoke("send-push", {
              body: {
                userId,
                title: alertTitle,
                body: alertMessage,
                url: "/attendance",
                tag: `attendance-${course.courseCode}`,
              },
            });
          } catch (pushErr) {
            console.error("Push dispatch non-fatal error:", pushErr);
          }
        }
      }

      // Best-effort claim. A successful portal login is proof of ownership of
      // this register number, so this should not normally conflict; if it
      // somehow does (stale data elsewhere), don't fail the import over it —
      // the subjects/CGPA are still real and worth saving.
      if (!profile?.college_id) {
        await supabaseAdmin
          .from("users")
          .update({ college_id: registerNumber })
          .eq("id", userId)
          .then(({ error }) => {
            if (error) console.error("college_id claim skipped (non-fatal):", error.code);
          });
      }

      if (isLink) {
        // Encrypt right here, reusing the plaintext already in memory for the
        // login POST above — no code path exists solely to receive a
        // plaintext DOB for storage. See srm_portal_credentials' migration
        // comment for the full threat-model reasoning.
        const { ciphertext, iv } = await encryptDob(dobPassword, userId);

        await supabaseAdmin.from("srm_portal_credentials").upsert({
          user_id: userId,
          register_number: registerNumber,
          dob_ciphertext: ciphertext,
          dob_iv: iv,
          encryption_version: 1,
          consecutive_failures: 0,
          last_success_at: nowIso,
          last_attempt_at: nowIso,
          last_error: null,
        }, { onConflict: "user_id" });

        await supabaseAdmin
          .from("users")
          .update({ date_of_birth_linked: true })
          .eq("id", userId)
          .then(({ error }) => {
            if (error) console.error("date_of_birth_linked flip failed (non-fatal):", error.code);
          });
      }

      return json({
        data: {
          program,
          currentSemester,
          cgpa,
          mobileNumber,
          subjectCount: subjects.length,
          subjects,
        },
      });
    }

    return json({ error: "Unknown step." }, 400);
  } catch (error) {
    console.error("import-srm-portal error:", error instanceof Error ? error.message : error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
