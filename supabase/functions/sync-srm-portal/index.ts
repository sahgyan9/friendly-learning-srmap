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
  parseAttendance,
  parseCourseList,
  parseFeeDues,
  parseFeePaidHistory,
  parseFeeReceipts,
  extractFeeConcessions,
  parseTodayAttendance,
  parseProfile,
  parseTimeTable,
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

async function isAuthorised(req: Request, targetUserId?: string): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (CRON_SECRET && secret === CRON_SECRET) return true;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const { data, error } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data?.user) return false;

  // Allow users to sync their own data
  if (targetUserId && data.user.id === targetUserId) return true;

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

  const body = await req.json().catch(() => ({}));
  const isForced = body.force === true;

  if (!(await isAuthorised(req, body.user_id))) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Check if today is a non-instructional day (weekend or university holiday)
  if (!isForced) {
    const { data: isHolidayOrWeekend } = await admin.rpc("is_non_instructional_day");
    if (isHolidayOrWeekend) {
      console.log("Skipping sync-srm-portal: Non-instructional day (weekend or university holiday).");
      return json({ skipped: true, reason: "Non-instructional day (weekend or university holiday)" });
    }
  }

  const cutoff = new Date(Date.now() - MIN_REATTEMPT_INTERVAL_MS).toISOString();

  // If specific userId is requested (for testing/manual run), target that user directly
  let query = admin
    .from("srm_portal_credentials")
    .select("user_id, register_number, dob_ciphertext, dob_iv, consecutive_failures, users!inner(date_of_birth_linked)")
    .eq("users.date_of_birth_linked", true);

  if (body.user_id) {
    query = query.eq("user_id", body.user_id);
  } else if (!isForced) {
    query = query.or(`last_attempt_at.is.null,last_attempt_at.lt.${cutoff}`);
  }

  const { data: batch, error: batchError } = await query
    .order("last_attempt_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (batchError) return json({ error: batchError.message }, 500);

  if (body.user_id && (!batch || batch.length === 0)) {
    return json({
      error: "No linked SRM portal credentials found for this account. Please click 'Re-link Portal' to save your login.",
    }, 400);
  }

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

      let loginResult: LoginResult | null = null;
      const MAX_ATTEMPTS = 5;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        if (attempt > 1) await sleep(500);
        try {
          const { jar, imageBytes } = await fetchLoginPageAndCaptcha();
          const { guess } = await recognizeCaptcha(imageBytes);

          if (!guess) continue;

          loginResult = await doLogin(jar, row.register_number, dobPassword, guess);
          if (loginResult.loggedIn) break;

          // If portal rejects credentials (wrong password/DOB), do not waste retries
          if (loginResult.errorMessage?.includes("Invalid User ID or Password")) break;
        } catch (attemptErr) {
          console.warn(`Login attempt ${attempt} error for ${row.user_id}:`, attemptErr);
        }
      }

      if (!loginResult || !loginResult.loggedIn) {
        failed += 1;
        const failures = row.consecutive_failures + 1;
        const errMsg = loginResult?.errorMessage ?? "Unattended login failed (captcha retry exhausted).";
        if (failures >= FAILURE_THRESHOLD) {
          await unlinkAndNotify(row.user_id, errMsg);
          unlinked += 1;
        } else {
          await admin.from("srm_portal_credentials").update({
            consecutive_failures: failures,
            last_attempt_at: nowIso,
            last_error: errMsg,
          }).eq("user_id", row.user_id);
        }
        continue;
      }

      const {
        profileHtml,
        transcriptHtml,
        attendanceHtml,
        timeTableHtml,
        feePaidHtml,
        feeDueHtml,
        receiptHtml,
        todayAttendanceHtml,
        allSectionsHtml,
      } = await fetchAcademicSections(loginResult.jar, loginResult.landingPageHtml);
      const { program, currentSemester, mobileNumber } = parseProfile(profileHtml);
      const courseMap = parseCourseList(...(allSectionsHtml || []));
      const { cgpa, subjects } = parseTranscript(transcriptHtml);
      const attendanceCourses = parseAttendance(attendanceHtml, courseMap);

      // 1. Upsert academic transcript & profile summary
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

      // 2. Upsert subject-wise attendance and check for low attendance alerts
      for (const course of attendanceCourses) {
        await admin.from("student_attendance").upsert({
          user_id: row.user_id,
          register_number: row.register_number,
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

        // Trigger Alert if < 75%
        if (course.attendancePercentage < 75.0 && course.conductedHours > 0) {
          // Check for existing alert in the past 5 days to avoid spamming the bell
          const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
          const { data: recentAlerts } = await admin
            .from("notifications")
            .select("id, created_at, data")
            .eq("user_id", row.user_id)
            .eq("type", "attendance_alert")
            .gte("created_at", fiveDaysAgo);

          const alreadyAlerted = (recentAlerts || []).some(
            (a: { data?: { course_code?: string } }) => a.data?.course_code === course.courseCode,
          );

          if (!alreadyAlerted) {
            const alertTitle = `⚠️ Attendance Alert: ${course.courseCode} (${course.attendancePercentage}%)`;
            const alertMessage = `Your attendance in ${course.courseName} is ${course.attendancePercentage}%. You need to attend the next ${course.classesNeeded} consecutive class(es) to reach 75%.`;

            // Insert into public.notifications for real-time Bell Icon update
            await admin.from("notifications").insert({
              user_id: row.user_id,
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

            // Dispatch Web Push notification to mobile / desktop devices
            try {
              await admin.functions.invoke("send-push", {
                body: {
                  userId: row.user_id,
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
      }

      // 3. Upsert weekly timetable slots
      const timetableSlots = parseTimeTable(timeTableHtml, courseMap);
      if (timetableSlots.length > 0) {
        for (const slot of timetableSlots) {
          await admin.from("student_timetables").upsert({
            user_id: row.user_id,
            register_number: row.register_number,
            day_order: slot.dayOrder,
            day_name: slot.dayName,
            hour: slot.hour,
            start_time: slot.startTime,
            end_time: slot.endTime,
            slot: slot.slot,
            course_code: slot.courseCode,
            course_name: slot.courseName,
            faculty_name: slot.facultyName,
            room_number: slot.roomNumber,
            is_lab: slot.isLab,
            ltpc: slot.ltpc || null,
            last_synced_at: nowIso,
          }, { onConflict: "user_id,day_name,hour,course_code" });
        }
      }

      // 4. Upsert fee dues & trigger alerts if money or fine is raised
      const { feeDues, totalToBePaid, hasFine } = parseFeeDues(feeDueHtml);
      if (feeDues.length > 0) {
        const { data: existingDues } = await admin
          .from("student_fee_dues")
          .select("fee_category, fee_head, to_be_paid_amount, is_fine")
          .eq("user_id", row.user_id);

        const existingMap = new Map(
          (existingDues || []).map((d: { fee_category: string; fee_head: string; to_be_paid_amount: number; is_fine: boolean }) => [
            `${d.fee_category}::${d.fee_head}`,
            d,
          ])
        );

        let newFeeOrFineDetected = false;
        let alertTitle = "";
        let alertMessage = "";

        for (const item of feeDues) {
          await admin.from("student_fee_dues").upsert({
            user_id: row.user_id,
            register_number: row.register_number,
            fee_category: item.feeCategory,
            fee_head: item.feeHead,
            due_amount: item.dueAmount,
            collected_amount: item.collectedAmount,
            to_be_paid_amount: item.toBePaidAmount,
            is_fine: item.isFine,
            last_synced_at: nowIso,
          }, { onConflict: "user_id,fee_category,fee_head" });

          const existing = existingMap.get(`${item.feeCategory}::${item.feeHead}`);
          if (item.toBePaidAmount > 0) {
            if (!existing || item.toBePaidAmount > (existing.to_be_paid_amount || 0)) {
              newFeeOrFineDetected = true;
              if (item.isFine) {
                alertTitle = `Fine Imposed: ${item.feeHead} (INR ${item.toBePaidAmount.toLocaleString("en-IN")})`;
                alertMessage = `A fine of INR ${item.toBePaidAmount.toLocaleString("en-IN")} has been levied on your account. Please clear your dues immediately on the portal.`;
              } else if (!alertTitle) {
                alertTitle = `Fee Raised: ${item.feeCategory} (INR ${item.toBePaidAmount.toLocaleString("en-IN")})`;
                alertMessage = `A fee of INR ${item.toBePaidAmount.toLocaleString("en-IN")} for ${item.feeHead} has been raised on your SRM portal. Please pay on time to avoid Penalty of Fine.`;
              }
            }
          }
        }

        // Delete any dues that were cleared/paid (no longer in portal dues)
        const currentKeys = new Set(feeDues.map((d) => `${d.feeCategory}::${d.feeHead}`));
        for (const [key, d] of existingMap.entries()) {
          if (!currentKeys.has(key)) {
            await admin
              .from("student_fee_dues")
              .delete()
              .eq("user_id", row.user_id)
              .eq("fee_category", d.fee_category)
              .eq("fee_head", d.fee_head);
          }
        }

        // If there's an active fine or newly raised fee, trigger in-app notification & web push
        if (newFeeOrFineDetected && alertTitle) {
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
          const { data: recentFeeAlerts } = await admin
            .from("notifications")
            .select("id, title")
            .eq("user_id", row.user_id)
            .eq("type", "fee_alert")
            .gte("created_at", sevenDaysAgo);

          const alreadyNotified = (recentFeeAlerts || []).some(
            (a: { title?: string }) => a.title === alertTitle,
          );

          if (!alreadyNotified) {
            await admin.from("notifications").insert({
              user_id: row.user_id,
              type: "fee_alert",
              title: alertTitle,
              content: alertMessage,
              data: {
                total_to_be_paid: totalToBePaid,
                url: "/srmportal?tab=finance",
              },
              read: false,
            });

            try {
              await admin.functions.invoke("send-push", {
                body: {
                  userId: row.user_id,
                  title: alertTitle,
                  body: alertMessage,
                  url: "/srmportal?tab=finance",
                  tag: "fee-alert",
                },
              });
            } catch (pushErr) {
              console.error("Fee push dispatch non-fatal error:", pushErr);
            }
          }
        }
      } else {
        await admin.from("student_fee_dues").delete().eq("user_id", row.user_id);
      }

      // 5. Upsert fee paid history & institutional concessions
      const paidReceipts = parseFeeReceipts(receiptHtml);
      let itemsToUpsert = paidReceipts;

      if (paidReceipts.length > 0) {
        const concessions = extractFeeConcessions(feePaidHtml, paidReceipts);
        itemsToUpsert = [...paidReceipts, ...concessions];
        // Clean out previous stale / gross ledger records for this user
        await admin.from("student_fee_paid_history").delete().eq("user_id", row.user_id);
      } else {
        itemsToUpsert = parseFeePaidHistory(feePaidHtml);
      }

      if (itemsToUpsert.length > 0) {
        for (const item of itemsToUpsert) {
          await admin.from("student_fee_paid_history").upsert({
            user_id: row.user_id,
            register_number: row.register_number,
            term: item.term,
            fee_type: item.feeType,
            due_date: item.dueDate,
            amount: item.amount,
            receipt_date: item.receiptDate,
            payment_mode: item.paymentMode,
            receipt_number: item.receiptNumber || "",
            paid_amount: item.paidAmount,
            balance_due: item.balanceDue,
            last_synced_at: nowIso,
          }, { onConflict: "user_id,term,fee_type,receipt_number" });
        }
      }

      // 6. Upsert today attendance
      const todayAttendance = parseTodayAttendance(todayAttendanceHtml);
      if (todayAttendance.length > 0) {
        for (const item of todayAttendance) {
          await admin.from("student_daily_attendance").upsert({
            user_id: row.user_id,
            register_number: row.register_number,
            attendance_date: item.date,
            day_order: item.dayOrder,
            period_slot: item.hour,
            course_code: item.courseCode,
            course_name: item.courseName,
            status: item.status,
            last_synced_at: nowIso,
          }, { onConflict: "user_id,attendance_date,period_slot" });
        }
      }

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

  if (body.user_id && succeeded === 0 && failed > 0) {
    return json({
      error: "Could not sign in to the SRM portal. The captcha or portal credentials failed. Please click 'Re-link Portal' to refresh your credentials.",
      processed: 1,
      succeeded: 0,
      failed: 1,
    }, 400);
  }

  return json({ processed: (batch ?? []).length, succeeded, failed, unlinked, success: succeeded > 0 });
});

