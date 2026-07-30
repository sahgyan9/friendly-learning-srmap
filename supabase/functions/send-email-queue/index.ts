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
  const groups = new Map<string, QueueRow[]>();
  for (const row of pending as QueueRow[]) {
    const key = `${row.recipient_id}::${row.conversation_id ?? "none"}`;
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

      const unsubscribeUrl =
        `${SUPABASE_URL}/functions/v1/email-unsubscribe?token=${recipient.unsubscribe_token}`;

      const { subject, html, text } = renderMessageEmail({
        recipientName: recipient.name ?? "there",
        senderNames,
        preview,
        messageCount: unread.length,
        conversationId: rows[0].conversation_id,
        unsubscribeUrl,
      });

      const result = await resend.emails.send({
        from: FROM_ADDRESS,
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
