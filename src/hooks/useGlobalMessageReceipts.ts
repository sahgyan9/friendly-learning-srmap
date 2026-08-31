import { useCallback, useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useRealtimeSubscription } from "@/hooks/useRealtime";
import { markAllMessagesDelivered, markMessagesDelivered } from "@/integrations/supabase/services/realtime";

// Never a real user id, so the subscription below matches nothing while
// signed out — useRealtimeSubscription can't be called conditionally
// (hooks can't run conditionally), so this stands in for "no filter should
// ever match" rather than falling back to an unfiltered, all-users subscription.
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Global hook to acknowledge message delivery.
 * When the logged-in user is online or receives an incoming message anywhere in the app,
 * their client acknowledges delivery to turn single check into double check for the sender.
 */
export function useGlobalMessageReceipts(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    // Immediately acknowledge any pending incoming messages that arrived while user was offline
    void markAllMessagesDelivered();
  }, [userId]);

  // Subscribe to incoming messages targeting this user in real time. Reuses
  // useRealtimeSubscription (src/hooks/useRealtime.ts) rather than hand-rolling
  // a supabase.channel — that hook already guarantees a unique channel topic
  // per subscriber (a prior bug here crashed the whole app when two components
  // shared one).
  useRealtimeSubscription(
    "messages",
    useCallback(
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        if (!userId || payload.eventType !== "INSERT") return;
        const newMsg = payload.new as { conversation_id?: string; receiver_id?: string };
        if (newMsg?.conversation_id && newMsg?.receiver_id === userId) {
          void markMessagesDelivered(newMsg.conversation_id, userId);
        }
      },
      [userId],
    ),
    { column: "receiver_id", value: userId ?? NO_MATCH_ID },
  );
}
