// One-click unsubscribe from notification email.
//
// Deliberately public and deliberately tiny. The old footer linked to /profile,
// which demands a login — a recipient who cannot stop the mail in one click
// reports it as spam instead, and Gmail and Yahoo's bulk sender rules expect a
// URL that works without authentication.
//
// The token is an opaque uuid on public.users. It grants exactly one thing:
// setting email_notifications to false. It reveals no address, no name and no
// other row, and it cannot be used to turn notifications back on.
//
//   GET  /functions/v1/email-unsubscribe?token=<uuid>   (from the email footer)
//   POST same, for List-Unsubscribe-Post one-click.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://friendly-learning-srmap.vercel.app";

const page = (heading: string, body: string, status = 200) =>
  new Response(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading} — Friendly Learning</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f9fafb;color:#1f2937;">
  <div style="max-width:420px;padding:32px;text-align:center;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
    <h1 style="margin:0 0 12px;font-size:20px;">${heading}</h1>
    <p style="margin:0 0 20px;color:#4b5563;line-height:1.6;">${body}</p>
    <a href="${SITE_URL}/profile" style="color:#2563eb;text-decoration:none;font-weight:600;">Manage your preferences</a>
  </div>
</body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return page("Not allowed", "Use the link in your email.", 405);
  }

  const token = new URL(req.url).searchParams.get("token");

  // Validated as a uuid before it reaches the query so a malformed token is a
  // plain 400 rather than a database error.
  if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return page("Link not recognised", "That unsubscribe link is not valid. You can change your email settings from your profile.", 400);
  }

  const { data, error } = await admin
    .from("users")
    .update({ email_notifications: false })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Unsubscribe failed:", error.message);
    return page("Something went wrong", "We could not update your settings just now. Please try again, or change them from your profile.", 500);
  }

  // No row matched. Says the same thing as success on purpose: confirming
  // whether a token exists would make the endpoint an oracle for guessing them.
  if (!data) {
    return page("You're unsubscribed", "You will not receive notification emails from Friendly Learning.");
  }

  return page(
    "You're unsubscribed",
    "You will not receive notification emails from Friendly Learning. You can turn them back on any time from your profile.",
  );
});
