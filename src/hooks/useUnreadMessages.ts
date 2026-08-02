import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { MESSAGES_READ_EVENT } from "@/lib/message-events";

/** Coalesces a burst — marking a conversation read updates every row in it. */
const SETTLE_MS = 250;

/**
 * The unread count behind the navbar's message badge.
 *
 * ## The bug this replaces
 *
 * The old version kept a running total and adjusted it from realtime events:
 * `+1` on INSERT, and on UPDATE
 *
 *     if (oldMessage.is_read === false && newMessage.is_read === true) −1
 *
 * That decrement never ran, which is why the badge only ever went up and needed
 * a page refresh to clear.
 *
 * `public.messages` has REPLICA IDENTITY DEFAULT, so Postgres writes only the
 * primary key into the WAL's old-row image. `payload.old` therefore arrives as
 * `{ id }` and nothing else — `oldMessage.is_read` is `undefined`, not `false`,
 * and `undefined === false` is false. The condition could not be satisfied by
 * any real event. (`REPLICA IDENTITY FULL` would populate it, at the cost of
 * every message's full before-image going through the WAL and out to every
 * subscriber. Not worth it for one boolean.)
 *
 * Running arithmetic on events is fragile for a second reason anyway: a
 * duplicate delivery, a dropped event while the laptop was asleep, or a message
 * read in another tab all leave the total permanently wrong, with no way back.
 * That is the "sometimes it still shows even though I've read it" case.
 *
 * ## What it does now
 *
 * Events are treated purely as a signal to go and look again; the count itself
 * always comes from a `count: 'exact'` query. Any drift is corrected by the next
 * refresh, and there are four things that trigger one:
 *
 *  - realtime INSERT/UPDATE/DELETE on messages addressed to this user
 *  - MESSAGES_READ_EVENT, dispatched locally the moment a conversation is
 *    marked read, so the badge clears without waiting for the server round-trip
 *  - the tab becoming visible again
 *  - the window regaining focus
 *
 * The last two are what fix "read on my phone, still showing on my laptop".
 */
export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const userId = user?.id ?? null;
  // Guards every setState, so a response that lands after sign-out or unmount
  // cannot resurrect a stale badge.
  const activeRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readCount = useCallback(async () => {
    if (!userId) return;

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (!activeRef.current) return;

    if (error) {
      // Left at its previous value on purpose. Zeroing on a failed request
      // would hide real unread messages behind a network blip.
      console.error("Could not read the unread message count:", error);
      return;
    }

    setUnreadCount(count ?? 0);
  }, [userId]);

  useEffect(() => {
    activeRef.current = true;

    if (!userId) {
      setUnreadCount(0);
      return () => {
        activeRef.current = false;
      };
    }

    const refresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(readCount, SETTLE_MS);
    };

    readCount();

    // One handler for all three operations. DELETE is included because a
    // removed unread message should take its badge with it, and it costs
    // nothing to say so.
    const channel = supabase
      .channel(`unread-messages-${userId}`)
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
  }, [userId, readCount]);

  return unreadCount;
};
