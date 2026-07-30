// Retired. Replaced by send-email-queue.
//
// This function accepted recipient_email, recipient_name, sender_name and
// message_content from the request body, ran with verify_jwt = false, performed
// no authentication of its own, and interpolated the values into HTML unescaped.
// Anyone who knew the URL could send arbitrary mail containing arbitrary links
// from this project's from-address. It also reported HTTP 200 {"success": true}
// whether or not Resend accepted the send, so a year of 403s from an unverified
// domain was indistinguishable from a year of delivered mail.
//
// It is kept as a deployed stub rather than deleted so that the endpoint cannot
// be re-created by an old client or a stale trigger and quietly start working:
// the URL now refuses everything.
//
// Email is now queued to public.email_queue by the on_message_created_email
// _notification trigger and drained by send-email-queue, which takes no
// recipient and no content from its caller.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  return new Response(
    JSON.stringify({
      error: "Gone",
      detail: "send-message-notification has been retired. Email is queued to email_queue and sent by send-email-queue.",
    }),
    { status: 410, headers: { "Content-Type": "application/json", ...corsHeaders } },
  );
});
