// Sends an admin's reply to a public contact-form message via Resend.
//
// Takes only a contact_response_id -- subject, message, and recipient are
// re-read from the database with the service role, never trusted from the
// request body, matching the pattern established by send-email-queue.
//
// Unlike email_queue (built for authenticated-user notifications keyed on
// auth.users.id), a contact-form respondent usually has no account at all, so
// this sends immediately rather than enqueuing: there is exactly one email
// per admin reply, sent once by a human action, not a trigger that could fire
// in a burst.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@4.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_ADDRESS = Deno.env.get("EMAIL_FROM") ?? "Friendly Learning <no-reply@friendlylearning.com>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderReplyEmail(opts: { recipientName: string; subject: string; message: string }): { html: string; text: string } {
  const { recipientName, subject, message } = opts;
  const safeName = escapeHtml(recipientName || "there");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const html = [
    "<!DOCTYPE html>",
    '<html lang="en"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<title>${safeSubject}</title></head>`,
    '<body style="margin:0;padding:20px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#1f2937;background:#f9fafb;">',
    '<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">',
    '<div style="background:#2563eb;padding:24px;text-align:center;">',
    '<h1 style="color:#ffffff;margin:0;font-size:20px;">Friendly Learning</h1></div>',
    '<div style="padding:28px;">',
    `<p style="margin:0 0 16px;font-size:16px;">Dear ${safeName},</p>`,
    '<p style="margin:0 0 20px;font-size:16px;">Thank you for contacting us. Here is our response to your inquiry:</p>',
    '<div style="background:#f3f4f6;padding:16px;border-radius:8px;border-left:3px solid #2563eb;margin:0 0 24px;">',
    `<p style="margin:0;color:#4b5563;">${safeMessage}</p></div>`,
    '<p style="margin:0;font-size:14px;color:#6b7280;">If you have any further questions, feel free to reply to this email.</p>',
    "</div>",
    '<div style="padding:16px 28px;border-top:1px solid #e5e7eb;background:#f9fafb;">',
    '<p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Friendly Learning SRMAP</p>',
    "</div></div></body></html>",
  ].join("");

  const text = [
    `Dear ${recipientName || "there"},`,
    "",
    "Thank you for contacting us. Here is our response to your inquiry:",
    "",
    message,
    "",
    "If you have any further questions, feel free to reply to this email.",
  ].join("\n");

  return { html, text };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const { data: userData, error: userError } = await admin.auth.getUser(auth.slice(7));
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);

  const { data: profile } = await admin
    .from("users")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profile?.is_admin !== true) return json({ error: "Forbidden" }, 403);

  if (!RESEND_API_KEY) {
    return json({ error: "RESEND_API_KEY is not configured", success: false }, 503);
  }

  let body: { contact_response_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { contact_response_id } = body;
  if (!contact_response_id) return json({ error: "contact_response_id is required" }, 400);

  const { data: response, error: responseError } = await admin
    .from("contact_responses")
    .select("subject, message, recipient_email, recipient_name")
    .eq("id", contact_response_id)
    .maybeSingle();

  if (responseError || !response) {
    return json({ error: "Response not found" }, 404);
  }

  const { html, text } = renderReplyEmail({
    recipientName: response.recipient_name,
    subject: response.subject,
    message: response.message,
  });

  const resend = new Resend(RESEND_API_KEY);
  const result = await resend.emails.send({
    from: FROM_ADDRESS,
    ...(REPLY_TO ? { replyTo: REPLY_TO } : {}),
    to: [response.recipient_email],
    subject: response.subject,
    html,
    text,
  });

  // Resend reports failures in the body rather than throwing.
  if (result.error) {
    return json({ error: `${result.error.name ?? "resend_error"}: ${result.error.message}`, success: false }, 502);
  }

  return json({ success: true, messageId: result.data?.id });
});
