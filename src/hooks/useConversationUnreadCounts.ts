import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MESSAGES_READ_EVENT } from "@/lib/message-events";

/** Coalesces a burst — marking a conversation read updates every row in it. */
const SETTLE_MS = 250;

/**
 * Per-conversation unread counts for the conversation list's badges.
 *
 * Same refresh-on-signal shape as useUnreadMessages (the navbar badge), and
 * for the same reason: public.messages has REPLICA IDENTITY DEFAULT, so a
 * realtime UPDATE's payload.old is `{ id }` only. There is no `was it unread
 * before` to diff against client-side, so events are just a "go look again"
 * trigger and the counts always come from a fresh read of is_read=false rows.
 *
 * conversation_id isn't part of the exact-count PostgREST response shape, so
 * this pulls the (small) set of unread rows' conversation_id and tallies them
 * in JS rather than issuing one count query per conversation.
 */
export const useConversationUnreadCounts = (userId: string | null) => {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readCounts = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("messages")
      .select("conversation_id")
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (!activeRef.current) return;

    if (error) {
      // Left at its previous value on purpose, same as useUnreadMessages:
      // zeroing on a failed request would hide real unread messages behind
      // a network blip.
      console.error("Could not read per-conversation unread counts:", error);
      return;
    }

    const next = new Map<string, number>();
    for (const row of data ?? []) {
      next.set(row.conversation_id, (next.get(row.conversation_id) ?? 0) + 1);
    }
    setCounts(next);
  }, [userId]);

  useEffect(() => {
    activeRef.current = true;

    if (!userId) {
      setCounts(new Map());
      return () => {
        activeRef.current = false;
      };
    }

    const refresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(readCounts, SETTLE_MS);
    };

    readCounts();

    const channel = supabase
      .channel(`unread-message-counts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    window.addEventListener(MESSAGES_READ_EVENT, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener(MESSAGES_READ_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, readCounts]);

  const getUnreadCount = useCallback((conversationId: string) => counts.get(conversationId) ?? 0, [counts]);

  return getUnreadCount;
};
