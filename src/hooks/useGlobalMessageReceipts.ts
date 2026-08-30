import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { markAllMessagesDelivered, markMessagesDelivered } from "@/integrations/supabase/services/realtime";

let globalCounter = 0;

/**
 * Global hook to acknowledge message delivery.
 * When the logged-in user is online or receives an incoming message anywhere in the app,
 * their client acknowledges delivery to turn single check into double check for the sender.
 */
export function useGlobalMessageReceipts(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    // 1. Immediately acknowledge any pending incoming messages that arrived while user was offline
    void markAllMessagesDelivered();

    // 2. Subscribe to incoming messages targeting this user in real time
    const channelId = `global-incoming-receipts-${userId}-${++globalCounter}`;
    const channel = supabase.channel(channelId);

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        const newMsg = payload.new as { conversation_id?: string; receiver_id?: string; delivery_status?: string };
        if (newMsg?.conversation_id && newMsg?.receiver_id === userId) {
          void markMessagesDelivered(newMsg.conversation_id, userId);
        }
      }
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);
}
