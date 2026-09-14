// Public Contact page submissions -> public.contact_messages.
//
// verify_jwt = false on purpose: signed-out visitors must be able to write to
// us. That makes this an open endpoint, so every limit lives here:
//
//   - Length caps on each field (the page's inputs carry the same maxLength).
//   - A per-address limit (3 per hour) and a site-wide flood limit (30 per 10
//     minutes), counted from contact_messages itself so no extra table is
//     needed. The flood limit is the real protection; the per-address limit
//     stops one person re-sending the same message.
//   - Nothing personal is logged. Function logs are not somewhere this project
//     manages access or retention for, so only the row id is written there.
//   - The response is { success } and nothing else; it used to echo the whole
//     inserted row.
//
// It writes with the service role because contact_messages has no INSERT
// policy for anon.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders as buildCorsHeaders, json as jsonResponse } from "../_shared/http.ts";

const corsHeaders = buildCorsHeaders();
const json = (body: unknown, status = 200) => jsonResponse(body, status, corsHeaders);

const LIMITS = { name: 100, email: 254, subject: 200, message: 5000 } as const;
const PER_ADDRESS_PER_HOUR = 3;
const SITE_WIDE_PER_10_MIN = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

function field(body: Record<string, unknown>, key: keyof typeof LIMITS): string {
  const value = body[key];
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Use POST." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "The request body must be JSON." }, 400);
  }

  const name = field(body, "name");
  const email = field(body, "email").toLowerCase();
  const subject = field(body, "subject");
  const message = field(body, "message");

  if (!name || !email || !subject || !message) {
    return json({ success: false, error: "Name, email, subject and message are all required." }, 400);
  }
  for (const [key, value] of Object.entries({ name, email, subject, message })) {
    const max = LIMITS[key as keyof typeof LIMITS];
    if (value.length > max) {
      return json({ success: false, error: `${key[0].toUpperCase()}${key.slice(1)} must be ${max} characters or fewer.` }, 400);
    }
  }
  if (!EMAIL_RE.test(email)) {
    return json({ success: false, error: "Enter a valid email address." }, 400);
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const [{ count: fromAddress, error: addressError }, { count: siteWide, error: siteError }] = await Promise.all([
    supabase.from("contact_messages").select("id", { count: "exact", head: true })
      .eq("email", email).gte("created_at", hourAgo),
    supabase.from("contact_messages").select("id", { count: "exact", head: true })
      .gte("created_at", tenMinutesAgo),
  ]);
  if (addressError || siteError) {
    console.error("contact-form rate-limit query failed:", (addressError ?? siteError)?.message);
    return json({ success: false, error: "Could not send your message. Please try again in a minute." }, 500);
  }
  if ((fromAddress ?? 0) >= PER_ADDRESS_PER_HOUR) {
    return json({ success: false, error: "You have already sent 3 messages in the last hour. Please wait before sending another." }, 429);
  }
  if ((siteWide ?? 0) >= SITE_WIDE_PER_10_MIN) {
    return json({ success: false, error: "The contact form is receiving a lot of messages right now. Please try again in 10 minutes." }, 429);
  }

  const { data, error } = await supabase
    .from("contact_messages")
    .insert({ name, email, subject, message, status: "unread" })
    .select("id")
    .single();

  if (error) {
    console.error("contact-form insert failed:", error.message);
    return json({ success: false, error: "Could not send your message. Please try again in a minute." }, 500);
  }

  console.log("contact message saved:", data.id);
  return json({ success: true });
});
