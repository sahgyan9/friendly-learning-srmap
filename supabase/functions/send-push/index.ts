// Supabase Edge Function: send-push
// Dispatches encrypted Web Push notifications to user devices via VAPID protocol.
// Automatically cleans up invalid/expired subscriptions (HTTP 404 / 410).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BKOAXjuHWTibnWSS7ncFnSVue84A_AYycGVEvqWT4gnIRwfJZxt7HxKjIjm7WlteDJf5sqkqeFTTHxAAtxAHsc4";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "EK3cmJuKDHrXph1nF_C0fH2OJbzplDfSQJTB0l-1j4o";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@friendlylearning.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} catch (err) {
  console.error("[send-push] VAPID configuration error:", err);
}

interface PushPayload {
  userId?: string;
  userIds?: string[];
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const payload: PushPayload = await req.json();
    const rawIds = payload.userIds || (payload.userId ? [payload.userId] : []);
    const targetUserIds = Array.from(new Set(rawIds.filter(Boolean)));

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ error: "No recipient userIds provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 1. Fetch users to verify push_notifications_enabled preference
    const { data: users, error: userError } = await admin
      .from("users")
      .select("id, push_notifications_enabled")
      .in("id", targetUserIds);

    if (userError) {
      console.error("[send-push] Failed to query users:", userError);
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const eligibleUserIds = (users || [])
      .filter((u) => u.push_notifications_enabled !== false)
      .map((u) => u.id);

    if (eligibleUserIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No eligible recipients (push disabled or not found)", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 2. Fetch device push subscriptions
    const { data: subscriptions, error: subError } = await admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", eligibleUserIds);

    if (subError) {
      console.error("[send-push] Failed to query push_subscriptions:", subError);
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscriptions found for users", sent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const pushContent = JSON.stringify({
      title: payload.title || "Friendly Learning SRMAP",
      body: payload.body,
      icon: payload.icon || "/pwa-192x192.png",
      badge: payload.badge || "/badge-96x96.png",
      tag: payload.tag || "general",
      url: payload.url || "/",
      data: payload.data || {},
    });

    let sent = 0;
    let failed = 0;
    const staleSubIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, pushContent);
          sent++;
        } catch (err: any) {
          failed++;
          const statusCode = err?.statusCode || err?.status;
          console.warn(`[send-push] Error sending to ${sub.endpoint.slice(0, 30)}... (status: ${statusCode}):`, err?.message || err);
          // 404 or 410 indicates endpoint expired or uninstalled
          if (statusCode === 404 || statusCode === 410) {
            staleSubIds.push(sub.id);
          }
        }
      })
    );

    // 3. Prune stale subscriptions
    if (staleSubIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", staleSubIds);
      console.log(`[send-push] Pruned ${staleSubIds.length} stale push subscription(s).`);
    }

    // 4. If this was a chat message push and at least one device received it,
    // acknowledge delivery of THAT SPECIFIC message so the sender sees a double
    // tick — scoped by message id, not by receiver, so it never touches other
    // pending messages the receiver's device hasn't actually gotten yet.
    const messageId = typeof payload.data?.messageId === "string" ? payload.data.messageId : undefined;
    if (sent > 0 && messageId && (payload.tag?.startsWith("chat-") || payload.url?.startsWith("/messages"))) {
      try {
        await admin
          .from("messages")
          .update({ delivery_status: "delivered" })
          .eq("id", messageId)
          .in("receiver_id", eligibleUserIds)
          .eq("delivery_status", "sent");
      } catch (delivErr) {
        console.warn("[send-push] Could not update delivery_status:", delivErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        failed,
        pruned: staleSubIds.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("[send-push] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
