// Drains public.email_queue and sends the resulting email through Resend.
// Authenticates callers with a CRON_SECRET header or an admin JWT, and takes no
// recipient address or message body from the request -- both are read from the
// database with the service role. Driven by the pg_cron job
// 'send-email-queue-sweep' every 5 minutes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

// The public origin, taken from configuration rather than derived from
// SUPABASE_URL, so links point at a host that actually exists.
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://friendly-learning-srmap.vercel.app";
const FROM_ADDRESS = Deno.env.get("EMAIL_FROM") ?? "Friendly Learning <no-reply@friendlylearning.com>";
// Where a reply goes, which is not where the mail is sent from. Resend will only
// send from a domain whose DNS you control, and srmap.edu.in is the university's
// -- so the human address belongs here, on a header any mail client honours,
// rather than in From where it would simply be rejected.
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";

/** How long to let a burst of messages settle before emailing about it. */
const QUIET_PERIOD_MS = 3 * 60 * 1000;
/**
 * Past this age a row is dropped unsent, so a queue that sat idle while email
 * was switched off does not empty itself the moment it is switched on.
 */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Give up after this many tries so one poisoned row cannot block the queue. */
const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Escapes text for interpolation into HTML, so message content cannot inject markup. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function isAuthorised(req: Request): Promise<boolean> {
  const secret = req.headers.get("x-cron-secret");
  if (CRON_SECRET && secret && secret === CRON_SECRET) return true;

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return false;

  const token = auth.slice(7);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return false;

  const { data: profile } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile?.is_admin === true;
}

interface QueueRow {
  id: string;
  recipient_id: string;
  kind: string;
  message_id: string | null;
  conversation_id: string | null;
  attempts: number;
}

function renderMessageEmail(opts: {
  recipientName: string;
  senderNames: string[];
  preview: string;
  messageCount: number;
  conversationId: string | null;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const { recipientName, senderNames, preview, messageCount, conversationId, unsubscribeUrl } = opts;

  const who = senderNames.length === 1
    ? senderNames[0]
    : `${senderNames.slice(0, -1).join(", ")} and ${senderNames[senderNames.length - 1]}`;

  const subject = messageCount === 1
    ? `New message from ${who}`
    : `${messageCount} new messages from ${who}`;

  const conversationUrl = conversationId
    ? `${SITE_URL}/messages?chat=${encodeURIComponent(conversationId)}`
    : `${SITE_URL}/messages`;

  const safeName = escapeHtml(recipientName);
  const safeWho = escapeHtml(who);
  const safePreview = escapeHtml(preview);
  const countPhrase = messageCount === 1 ? "a new message" : `${messageCount} new messages`;

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(subject)}</title></head>`,
    '<body style="margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#1f2937;background:#f9fafb;">',
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">',
    '<div style="background:#2563eb;padding:24px;text-align:center;">',
    '<h1 style="color:#ffffff;margin:0;font-size:20px;">Friendly Learning</h1></div>',
    '<div style="padding:28px;">',
    `<p style="margin:0 0 16px;font-size:16px;">Hi ${safeName},</p>`,
    `<p style="margin:0 0 20px;font-size:16px;">You have ${countPhrase} from <strong>${safeWho}</strong>.</p>`,
    '<div style="background:#f3f4f6;padding:16px;border-radius:8px;border-left:3px solid #2563eb;margin:0 0 24px;">',
    `<p style="margin:0;color:#4b5563;">${safePreview}</p></div>`,
    '<p style="text-align:center;margin:0 0 8px;">',
    `<a href="${conversationUrl}" style="background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">Reply</a>`,
    '</p></div>',
    '<div style="padding:16px 28px;border-top:1px solid #e5e7eb;background:#f9fafb;">',
    '<p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">',
    `<a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe from these emails</a>`,
    '</p></div></div></body></html>',
  ].join("");

  const text = [
    `Hi ${recipientName},`,
    "",
    `You have ${countPhrase} from ${who}.`,
    "",
    preview,
    "",
    `Reply: ${conversationUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * The one email a new mentor gets, sent once, right after approval.
 *
 * Content and design mirror buildWelcomeEmail() in
 * src/components/admin/verification/welcome-email.ts — the admin's manual
 * Gmail-draft template — so the automatic send and the manual fallback read
 * as the same email. Two deliberate differences from that source: the name is
 * HTML-escaped here (nothing reviews this copy before it goes out, unlike a
 * draft a human proofreads before hitting send), and the footer carries the
 * unsubscribe link this automated pipeline is required to offer.
 */
function renderWelcomeMentorEmail(opts: {
  recipientName: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const { recipientName, unsubscribeUrl } = opts;

  // "gyan kumar sah | AP23111260062" is a real shape in this table. Greeting
  // someone by their registration number is worse than not greeting them.
  const firstName = recipientName.split("|")[0].trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);

  const subject = `${firstName}, you're live as a mentor on Friendly Learning`;

  const html = [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(subject)}</title></head>`,
    '<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f6f8;padding:24px 12px;"><tr><td align="center">',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">',

    '<tr><td style="background:linear-gradient(135deg,#3b63c4 0%,#2c4c96 100%);padding:32px 28px;text-align:center;">',
    '<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 16px auto;background-color:#ffffff;border-radius:10px;box-shadow:0 4px 12px rgba(15,23,42,0.18);"><tr><td style="padding:9px 16px;">',
    '<table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>',
    `<td style="vertical-align:middle;padding-right:8px;"><img src="${SITE_URL}/lovable-uploads/df76e963-f250-4f25-8f7b-3917f857fe63.png" width="40" height="26" alt="Friendly Learning" style="display:block;border:0;"></td>`,
    '<td style="vertical-align:middle;white-space:nowrap;font-size:15px;font-weight:700;letter-spacing:-0.2px;"><span style="color:#3963c6;">Friendly</span><span style="color:#0f172a;">Learning</span><span style="color:#3963c6;font-size:10px;font-weight:600;letter-spacing:0.3px;margin-left:4px;">SRMAP</span></td>',
    "</tr></table></td></tr></table>",
    `<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;line-height:1.3;">You're live, ${safeName}! 🎉</h1>`,
    '<p style="color:#dbeafe;font-size:15px;margin:8px 0 0 0;">No approval queue — your mentor profile is already up.</p>',
    "</td></tr>",

    '<tr><td style="padding:28px 24px;">',
    `<p style="font-size:15px;line-height:1.6;color:#334155;margin-top:0;">Hi <strong>${safeName}</strong>,</p>`,
    '<p style="font-size:15px;line-height:1.6;color:#334155;">Juniors in your department can already find you and start a conversation — no introductions needed.</p>',

    '<div style="background-color:#eff6ff;border-left:4px solid #3963c6;padding:14px 18px;border-radius:0 8px 8px 0;margin:20px 0;">',
    "<p style=\"margin:0;font-size:14px;line-height:1.5;color:#1e40af;\">💡 <em>Nobody's expecting office hours — most questions take two minutes. Help 3 students (real replies, not just messages sent) and you earn a certificate with a public verify link. Not a participation badge — an earned one.</em></p>",
    "</div>",

    '<h2 style="font-size:17px;font-weight:700;color:#0f172a;margin-top:24px;margin-bottom:16px;">🚀 Quick Ways to Get Started</h2>',

    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:12px;background-color:#ffffff;"><tr><td style="padding:16px;">',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>',
    '<td width="36" valign="top" style="font-size:20px;padding-right:12px;">💬</td>',
    '<td><h3 style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">Answer a Question</h3>',
    '<p style="margin:4px 0 12px 0;font-size:13px;color:#64748b;line-height:1.4;">Juniors are already waiting on advice about electives, projects, and careers. Each real reply counts toward your certificate.</p>',
    `<a href="${SITE_URL}/community-posts" style="display:inline-block;background-color:#3963c6;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 16px;border-radius:6px;">Browse Questions →</a>`,
    "</td></tr></table></td></tr></table>",

    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:12px;background-color:#ffffff;"><tr><td style="padding:16px;">',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>',
    '<td width="36" valign="top" style="font-size:20px;padding-right:12px;">👥</td>',
    '<td><h3 style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">Join or Start a Group</h3>',
    "<p style=\"margin:4px 0 12px 0;font-size:13px;color:#64748b;line-height:1.4;\">Hackathon teams, study circles, subject clubs — with fellow students, not just people you're mentoring.</p>",
    `<a href="${SITE_URL}/communities" style="display:inline-block;background-color:#3963c6;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 16px;border-radius:6px;">Explore Groups →</a>`,
    "</td></tr></table></td></tr></table>",

    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:12px;background-color:#ffffff;"><tr><td style="padding:16px;">',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tr>',
    '<td width="36" valign="top" style="font-size:20px;padding-right:12px;">⚡</td>',
    '<td><h3 style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">Set Your Pace</h3>',
    '<p style="margin:4px 0 12px 0;font-size:13px;color:#64748b;line-height:1.4;">During exams or busy weeks, toggle "Taking a break" anytime — your existing chats stay open, you just come off the directory.</p>',
    `<a href="${SITE_URL}/profile" style="display:inline-block;background-color:#475569;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 16px;border-radius:6px;">View Profile Settings →</a>`,
    "</td></tr></table></td></tr></table>",

    '<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:16px;">',
    '<p style="margin:0 0 10px 0;font-size:14px;font-weight:700;color:#0f172a;">Also worth exploring</p>',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">',
    `<tr><td style="padding:4px 0;"><span style="font-size:14px;margin-right:8px;">🤝</span><a href="${SITE_URL}/find-study-partners" style="font-size:13px;color:#3963c6;text-decoration:none;font-weight:500;">Find study partners</a><span style="font-size:13px;color:#94a3b8;margin-left:6px;">— never prep for exams alone</span></td></tr>`,
    `<tr><td style="padding:4px 0;"><span style="font-size:14px;margin-right:8px;">🚀</span><a href="${SITE_URL}/hackathon-partners" style="font-size:13px;color:#3963c6;text-decoration:none;font-weight:500;">Hackathon teammates</a><span style="font-size:13px;color:#94a3b8;margin-left:6px;">— build something real</span></td></tr>`,
    `<tr><td style="padding:4px 0;"><span style="font-size:14px;margin-right:8px;">⭐</span><a href="${SITE_URL}/faculty" style="font-size:13px;color:#3963c6;text-decoration:none;font-weight:500;">Anonymous faculty ratings</a><span style="font-size:13px;color:#94a3b8;margin-left:6px;">— pick better courses next semester</span></td></tr>`,
    "</table></div>",

    '<p style="font-size:14px;line-height:1.5;color:#334155;margin-top:24px;">Spot something broken, or just want to say hi? Reply to this email — I read these.</p>',
    "</td></tr>",

    '<tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 24px;text-align:center;">',
    '<p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#475569;">Friendly Learning SRMAP</p>',
    '<p style="margin:0;font-size:12px;color:#94a3b8;">You are getting this because your mentor application was approved.</p>',
    `<p style="margin:8px 0 0 0;font-size:12px;"><a href="${unsubscribeUrl}" style="color:#3963c6;text-decoration:none;font-weight:500;">Unsubscribe from these emails</a></p>`,
    "</td></tr>",

    "</table></td></tr></table></body></html>",
  ].join("");

  const text = [
    `Hi ${firstName},`,
    "",
    "Your mentor profile just went live — no approval queue, no waiting. Juniors in your department can already find you and start a conversation.",
    "",
    "Nobody's expecting office hours. Most questions take two minutes: which elective to pick, a project idea, a gut check on an internship offer.",
    "",
    "One more thing worth knowing: help 3 students — meaning they actually reply, not just receive a message — and you earn a real certificate. Not a participation badge: a verifiable one with a public link anyone can check.",
    "",
    "Three ways to start:",
    "",
    "1. Answer a question that's already waiting",
    `   ${SITE_URL}/community-posts`,
    "",
    "2. Join or start a group",
    `   ${SITE_URL}/communities`,
    "",
    "3. Set your pace",
    "   Exams or placements coming up? Toggle \"Taking a break\" on your profile any time — your existing chats stay open, you just come off the directory.",
    `   ${SITE_URL}/profile`,
    "",
    "Also worth exploring:",
    `- Find study partners → ${SITE_URL}/find-study-partners`,
    `- Hackathon teammates → ${SITE_URL}/hackathon-partners`,
    `- Anonymous faculty ratings (pick better courses) → ${SITE_URL}/faculty`,
    "",
    "Reply to this email if anything's confusing or broken.",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * The one email a brand-new account gets, sent once, right after signup.
 *
 * Mirrors renderWelcomeMentorEmail in tone and shape. Everyone lands here as a
 * student regardless of what they end up doing on the site, so this stays
 * generic -- find a mentor, ask a question, or start a group -- rather than
 * assuming a track. Someone who later becomes a mentor gets that welcome too,
 * from the separate trigger; the two are not mutually exclusive.
 */
function renderWelcomeStudentEmail(opts: {
  recipientName: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const { recipientName, unsubscribeUrl } = opts;

  // Same shape problem as the mentor email: SSO names can carry a trailing
  // "| AP23111260062", and a greeting should never include it.
  const firstName = recipientName.split("|")[0].trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);

  const subject = "Welcome to Friendly Learning 🎉";

  const steps: Array<[string, string]> = [
    [
      "Find someone one step ahead",
      "Every mentor here was a student a year or two ago, not a decade. Browse by department and message directly — no introductions needed.",
    ],
    [
      "Ask the question you already have",
      "Which elective, how to start a project, whether an offer is worth taking. Small questions are exactly what this is for.",
    ],
    [
      "Join a group",
      "Study circles, hackathon teams, placement-prep rooms. Some are open to anyone, some are invite-only — join what fits.",
    ],
  ];

  const stepHtml = steps
    .map(
      ([title, body], i) => `
      <tr>
        <td style="padding:0 0 18px;vertical-align:top;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="vertical-align:top;padding-right:12px;">
              <div style="width:26px;height:26px;border-radius:13px;background:#2563eb;color:#ffffff;font-size:13px;font-weight:700;text-align:center;line-height:26px;">${i + 1}</div>
            </td>
            <td style="vertical-align:top;">
              <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827;">${title}</p>
              <p style="margin:0;font-size:14px;color:#4b5563;line-height:1.55;">${body}</p>
            </td>
          </tr></table>
        </td>
      </tr>`,
    )
    .join("");

  const html = [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(subject)}</title></head>`,
    '<body style="margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#1f2937;background:#f9fafb;">',
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">',

    '<div style="background:#2563eb;padding:28px 24px;text-align:center;">',
    '<h1 style="color:#ffffff;margin:0 0 4px;font-size:21px;">You\'re in 🎉</h1>',
    '<p style="color:#dbeafe;margin:0;font-size:14px;">Welcome to Friendly Learning</p>',
    "</div>",

    '<div style="padding:28px;">',
    `<p style="margin:0 0 16px;font-size:16px;">Hi ${safeName},</p>`,

    '<p style="margin:0 0 24px;font-size:15px;color:#374151;">',
    "Friendly Learning exists for one reason: the person best placed to explain something is usually the one who learned it a year ago, not ten. That's here, waiting.",
    "</p>",

    '<div style="height:1px;background:#e5e7eb;margin:0 0 22px;"></div>',

    '<p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827;">Three ways to start</p>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">',
    stepHtml,
    "</table>",

    '<p style="text-align:center;margin:6px 0 22px;">',
    `<a href="${SITE_URL}/mentors" style="background:#2563eb;color:#ffffff;padding:13px 30px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;font-size:15px;">Browse mentors</a>`,
    "</p>",

    '<p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-align:center;line-height:1.6;">',
    `Ask a <a href="${SITE_URL}/community-posts" style="color:#2563eb;">question</a> &middot; `,
    `See <a href="${SITE_URL}/communities" style="color:#2563eb;">groups</a>`,
    "</p>",

    "</div>",

    '<div style="padding:16px 28px;border-top:1px solid #e5e7eb;background:#f9fafb;">',
    '<p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">',
    "You are getting this because you just created an account.<br>",
    `<a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe from these emails</a>`,
    "</p></div></div></body></html>",
  ].join("");

  const text = [
    `Hi ${firstName},`,
    "",
    "Friendly Learning exists for one reason: the person best placed to explain something is usually the one who learned it a year ago, not ten. That's here, waiting.",
    "",
    "THREE WAYS TO START",
    "",
    "1. Find someone one step ahead. Browse mentors by department and message directly.",
    "",
    "2. Ask the question you already have. Which elective, how to start a project, whether an offer is worth taking.",
    "",
    "3. Join a group. Study circles, hackathon teams, placement-prep rooms.",
    "",
    `Browse mentors: ${SITE_URL}/mentors`,
    `Ask a question: ${SITE_URL}/community-posts`,
    `See groups: ${SITE_URL}/communities`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Sent when sync-srm-portal has failed to log a mentor's linked SRM portal
 * in FAILURE_THRESHOLD consecutive unattended attempts and has unlinked
 * them (deleted their srm_portal_credentials row, flipped
 * users.date_of_birth_linked back to false). Explains the automatic refresh
 * stopped and points back to the profile page, where the nag will also
 * re-appear on next sign-in — this email and that nag are two surfaces for
 * the same condition, not two separate things to keep in sync.
 */
function renderSrmRelinkNeededEmail(opts: {
  recipientName: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const { recipientName, unsubscribeUrl } = opts;

  const firstName = recipientName.split("|")[0].trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);
  const profileUrl = `${SITE_URL}/profile`;

  const subject = `${firstName}, we couldn't refresh your SRM academic info — please re-link`;

  const html = [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(subject)}</title></head>`,
    '<body style="margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#1f2937;background:#f9fafb;">',
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">',
    '<div style="background:#2563eb;padding:24px;text-align:center;">',
    '<h1 style="color:#ffffff;margin:0;font-size:20px;">Friendly Learning</h1></div>',
    '<div style="padding:28px;">',
    `<p style="margin:0 0 16px;font-size:16px;">Hi ${safeName},</p>`,
    '<p style="margin:0 0 20px;font-size:16px;">Your SRM portal was linked to keep your CGPA, semester and coursework current automatically, but the last few attempts failed — likely a changed password or a portal hiccup — so we\'ve stopped trying and unlinked it.</p>',
    '<p style="text-align:center;margin:0 0 20px;">',
    `<a href="${profileUrl}" style="background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block;">Re-link my SRM portal</a>`,
    "</p></div>",
    '<div style="padding:16px 28px;border-top:1px solid #e5e7eb;background:#f9fafb;">',
    '<p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">',
    `<a href="${unsubscribeUrl}" style="color:#6b7280;">Unsubscribe from these emails</a>`,
    "</p></div></div></body></html>",
  ].join("");

  const text = [
    `Hi ${firstName},`,
    "",
    "Your SRM portal was linked to keep your CGPA, semester and coursework current automatically, but the last few attempts failed, so we've stopped trying and unlinked it.",
    "",
    `Re-link: ${profileUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Sent twice a year, on the days SRM AP publishes results, to students whose
 * imported transcript is now a semester out of date.
 *
 * Deliberately much shorter than the welcome emails. Those introduce a product
 * to someone who has just arrived; this one asks for a single 30-second action
 * from someone who already knows what the site is. Every extra paragraph here
 * is a reason to close the tab before doing it.
 *
 * It does not state the student's current CGPA or semester back to them. We
 * hold that data, but repeating academic standing in an email -- which sits
 * unencrypted in an inbox and on a phone lock screen -- is not worth the
 * marginal persuasion.
 */
function renderAcademicRefreshEmail(opts: {
  recipientName: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const { recipientName, unsubscribeUrl } = opts;

  const firstName = recipientName.split("|")[0].trim().split(/\s+/)[0] || "there";
  const safeName = escapeHtml(firstName);
  const profileUrl = `${SITE_URL}/profile`;

  const subject = `${firstName}, your results are out — refresh your profile in 30 seconds`;

  const html = [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${escapeHtml(subject)}</title></head>`,
    '<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f4f6f8;padding:24px 12px;"><tr><td align="center">',
    '<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">',

    '<tr><td style="background:linear-gradient(135deg,#3b63c4 0%,#2c4c96 100%);padding:28px 28px;text-align:center;">',
    '<table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto 16px auto;background-color:#ffffff;border-radius:10px;box-shadow:0 4px 12px rgba(15,23,42,0.18);"><tr><td style="padding:9px 16px;">',
    '<table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr>',
    `<td style="vertical-align:middle;padding-right:8px;"><img src="${SITE_URL}/lovable-uploads/df76e963-f250-4f25-8f7b-3917f857fe63.png" width="40" height="26" alt="Friendly Learning" style="display:block;border:0;"></td>`,
    '<td style="vertical-align:middle;white-space:nowrap;font-size:15px;font-weight:700;letter-spacing:-0.2px;"><span style="color:#3963c6;">Friendly</span><span style="color:#0f172a;">Learning</span><span style="color:#3963c6;font-size:10px;font-weight:600;letter-spacing:0.3px;margin-left:4px;">SRMAP</span></td>',
    "</tr></table></td></tr></table>",
    '<h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;line-height:1.3;">New semester, new results 📄</h1>',
    "</td></tr>",

    '<tr><td style="padding:28px 24px;">',
    `<p style="font-size:15px;line-height:1.6;color:#334155;margin-top:0;">Hi <strong>${safeName}</strong>,</p>`,
    '<p style="font-size:15px;line-height:1.6;color:#334155;">Results are out, which means the coursework on your profile is now a semester behind. Re-importing takes about 30 seconds and keeps you turning up when juniors search for the subjects you have actually taken.</p>',

    '<div style="text-align:center;margin:24px 0;">',
    `<a href="${profileUrl}" style="display:inline-block;background-color:#3963c6;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;">Refresh my academics →</a>`,
    "</div>",

    '<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 18px;">',
    "<p style=\"margin:0;font-size:13px;line-height:1.5;color:#64748b;\">You will sign in to the SRM portal yourself, exactly as you did the first time — we never store your portal password. Your CGPA stays private either way; only course names appear on your profile, and only if you switched that on.</p>",
    "</div>",
    "</td></tr>",

    '<tr><td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 24px;text-align:center;">',
    '<p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#475569;">Friendly Learning SRMAP</p>',
    '<p style="margin:0;font-size:12px;color:#94a3b8;">You are getting this because you imported your academics before. Twice a year, when results come out.</p>',
    `<p style="margin:8px 0 0 0;font-size:12px;"><a href="${unsubscribeUrl}" style="color:#3963c6;text-decoration:none;font-weight:500;">Unsubscribe from these emails</a></p>`,
    "</td></tr>",

    "</table></td></tr></table></body></html>",
  ].join("");

  const text = [
    `Hi ${firstName},`,
    "",
    "Results are out, which means the coursework on your profile is now a semester behind.",
    "",
    "Re-importing takes about 30 seconds, and it keeps you turning up when juniors search for the subjects you have actually taken.",
    "",
    `Refresh your academics: ${profileUrl}`,
    "",
    "You will sign in to the SRM portal yourself, exactly as you did the first time — we never store your portal password. Your CGPA stays private either way; only course names appear on your profile, and only if you switched that on.",
    "",
    "You are getting this because you imported your academics before. It goes out twice a year, when results come out.",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!(await isAuthorised(req))) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY is not configured", sent: 0 }, 503);
  }

  const resend = new Resend(RESEND_API_KEY);
  const now = Date.now();
  const ripeBefore = new Date(now - QUIET_PERIOD_MS).toISOString();
  const staleBefore = new Date(now - MAX_AGE_MS).toISOString();

  // Retire anything too old to be worth sending, before selecting work.
  const { count: expired } = await admin
    .from("email_queue")
    .update({ sent_at: new Date().toISOString(), last_error: "expired unsent" }, { count: "exact" })
    .is("sent_at", null)
    .lt("created_at", staleBefore);

  // Let a burst settle before emailing, so a rapid exchange is one email.
  const { data: pending, error: queueError } = await admin
    .from("email_queue")
    .select("id, recipient_id, kind, message_id, conversation_id, attempts")
    .is("sent_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .lte("created_at", ripeBefore)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (queueError) return json({ error: queueError.message }, 500);
  if (!pending || pending.length === 0) {
    return json({ sent: 0, skipped: 0, failed: 0, expired: expired ?? 0 });
  }

  // One email per recipient per conversation, however many messages arrived.
  // `kind` is part of the key so a welcome email is never folded into a message
  // digest: both have a null conversation_id, and without this the two would
  // group together and one of them would be settled without ever being sent.
  const groups = new Map<string, QueueRow[]>();
  for (const row of pending as QueueRow[]) {
    const key = `${row.recipient_id}::${row.kind}::${row.conversation_id ?? "none"}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  const settle = async (ids: string[], patch: Record<string, unknown>) => {
    await admin.from("email_queue").update(patch).in("id", ids);
  };

  for (const rows of groups.values()) {
    const ids = rows.map((r) => r.id);
    const recipientId = rows[0].recipient_id;

    try {
      const { data: recipient } = await admin
        .from("users")
        .select("email, name, email_notifications, unsubscribe_token")
        .eq("id", recipientId)
        .maybeSingle();

      // Re-checked here as well as at enqueue time, so someone who opts out in
      // between does not receive what was already queued.
      if (!recipient?.email || recipient.email_notifications === false) {
        await settle(ids, { sent_at: new Date().toISOString(), last_error: "recipient opted out or has no email" });
        skipped += ids.length;
        continue;
      }

      const unsubscribeUrl =
        `${SUPABASE_URL}/functions/v1/email-unsubscribe?token=${recipient.unsubscribe_token}`;

      const kind = rows[0].kind;
      let rendered: { subject: string; html: string; text: string };

      if (kind === "welcome_mentor") {
        rendered = renderWelcomeMentorEmail({
          recipientName: recipient.name ?? "there",
          unsubscribeUrl,
        });
      } else if (kind === "welcome_student") {
        rendered = renderWelcomeStudentEmail({
          recipientName: recipient.name ?? "there",
          unsubscribeUrl,
        });
      } else if (kind === "academic_refresh") {
        rendered = renderAcademicRefreshEmail({
          recipientName: recipient.name ?? "there",
          unsubscribeUrl,
        });
      } else if (kind === "srm_relink_needed") {
        rendered = renderSrmRelinkNeededEmail({
          recipientName: recipient.name ?? "there",
          unsubscribeUrl,
        });
      } else if (kind === "message") {
        const messageIds = rows.map((r) => r.message_id).filter(Boolean) as string[];
        const { data: messages } = await admin
          .from("messages")
          .select("id, content, sender_id, is_read, sent_at")
          .in("id", messageIds.length > 0 ? messageIds : ["00000000-0000-0000-0000-000000000000"])
          .order("sent_at", { ascending: true });

        // Already read on the site means the email is noise.
        const unread = (messages ?? []).filter((m) => m.is_read !== true);

        if (unread.length === 0) {
          await settle(ids, { sent_at: new Date().toISOString(), last_error: "already read on site" });
          skipped += ids.length;
          continue;
        }

        const senderIds = [...new Set(unread.map((m) => m.sender_id))];
        const { data: senders } = await admin.from("users").select("id, name").in("id", senderIds);
        const senderNames = senderIds.map(
          (id) => senders?.find((s) => s.id === id)?.name ?? "Someone",
        );

        const latest = unread[unread.length - 1];
        const raw = (latest.content ?? "").trim();
        const preview = raw.length > 140 ? `${raw.slice(0, 140)}...` : raw;

        rendered = renderMessageEmail({
          recipientName: recipient.name ?? "there",
          senderNames,
          preview,
          messageCount: unread.length,
          conversationId: rows[0].conversation_id,
          unsubscribeUrl,
        });
      } else {
        // A kind this deployment does not know how to render. Left unsent on
        // purpose: falling through to the message branch would settle it as
        // "already read" and destroy it. Waiting means a row queued by a newer
        // migration survives until this function catches up, and MAX_AGE_MS
        // still stops it waiting forever.
        console.warn(`Unknown email_queue kind "${kind}", leaving ${ids.length} row(s) unsent`);
        skipped += ids.length;
        continue;
      }

      const { subject, html, text } = rendered;

      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
        to: [recipient.email],
        subject,
        html,
        text,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      // Resend reports failures in the body rather than throwing, so this must be
      // checked explicitly or every failure looks like a success.
      if (result.error) {
        throw new Error(`${result.error.name ?? "resend_error"}: ${result.error.message}`);
      }

      await settle(ids, { sent_at: new Date().toISOString(), last_error: null });
      sent += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Email send failed for recipient ${recipientId}: ${message}`);
      // Left unsent so the next sweep retries, up to MAX_ATTEMPTS.
      for (const row of rows) {
        await admin
          .from("email_queue")
          .update({ attempts: row.attempts + 1, last_error: message })
          .eq("id", row.id);
      }
      failed += 1;
    }
  }

  return json({ sent, skipped, failed, expired: expired ?? 0, considered: pending.length });
});
