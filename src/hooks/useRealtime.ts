
import { useEffect, useRef } from 'react';

import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { updateUserPresence } from '@/integrations/supabase/services/realtime';

export const useUserPresence = (userId: string) => {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!userId || !userId.trim()) return;

    // Set user as online when component mounts
    void updateUserPresence(userId, true);

    // Update presence every 2 minutes — reduces WAL write churn by 4× vs 30s.
    // Online indicators still update within 2 min which is imperceptible to users.
    intervalRef.current = setInterval(() => {
      void updateUserPresence(userId, true);
    }, 120_000);

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void updateUserPresence(userId, true);
      } else {
        void updateUserPresence(userId, false);
      }
    };

    // Handle beforeunload to set user offline
    const handleBeforeUnload = () => {
      void updateUserPresence(userId, false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Set user offline when component unmounts
      void updateUserPresence(userId, false);
    };
  }, [userId]);
};

/**
 * Every subscriber needs its own channel topic.
 *
 * supabase.channel(topic) does not hand back a fresh channel — it looks for one
 * already registered under that topic and returns it if it finds one. This hook
 * named the topic after the table, so the second component on a page to watch
 * the same table was handed the first one's *already subscribed* channel, and
 * calling .on() on a subscribed channel throws:
 *
 *   cannot add `postgres_changes` callbacks for realtime:realtime-user_presence
 *   after `subscribe()`
 *
 * That is what was killing /messages. ConversationList and ChatHeader both call
 * useUserPresenceRealtime, and ChatHeader only mounts once a conversation is
 * open — so the page worked perfectly for an account with no conversations and
 * threw for everyone else. The throw happened in a passive effect, escaped to
 * ErrorBoundary, and the whole app came down.
 */
let channelCounter = 0;

export const useRealtimeSubscription = (
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
  filter?: { column: string; value: string }
) => {
  // Read through a ref so a caller passing an inline arrow does not tear the
  // subscription down and build it up again on every single render.
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // `filter` is a fresh object literal at most call sites, so comparing it by
  // identity re-ran this effect constantly. Compare the string it becomes.
  const filterKey = filter ? `${filter.column}=eq.${filter.value}` : null;

  useEffect(() => {
    const channel = supabase.channel(`realtime-${table}-${++channelCounter}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table,
        ...(filterKey ? { filter: filterKey } : {}),
      } as never,
      (payload) => callbackRef.current(payload)
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, filterKey]);
};
