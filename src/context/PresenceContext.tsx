/**
 * PresenceContext — shared Supabase Realtime channel for:
 *   1. Presence  (channel.track / channel.presenceState)  — replaces DB writes to user_presence
 *   2. Broadcast (channel.send)                           — replaces DB writes to typing_indicators
 *
 * Zero DB queries. Zero WAL entries. Runs entirely over WebSocket in-memory.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  user_id: string;
  online_at: number;
}

interface TypingPayload {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
}

interface PresenceContextValue {
  isUserOnline: (userId: string) => boolean;
  presenceMap: Record<string, PresenceState>;
  broadcastTyping: (conversationId: string, isTyping: boolean) => void;
  useTypingBroadcast: (conversationId: string | null) => TypingPayload[];
}

const PresenceContext = createContext<PresenceContextValue | null>(null);

const CHANNEL_NAME = 'app-presence';

export function PresenceProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [presenceMap, setPresenceMap] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingListenersRef = useRef<Map<string, Set<(payload: TypingPayload) => void>>>(new Map());

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: userId ?? 'anon' } },
    });
    channelRef.current = channel;

    const syncPresence = () => {
      const raw = channel.presenceState<PresenceState>();
      const merged: Record<string, PresenceState> = {};
      for (const key of Object.keys(raw)) {
        const metas = raw[key];
        if (metas && metas.length > 0) {
          const latest = metas.reduce((a, b) => ((a.online_at ?? 0) > (b.online_at ?? 0) ? a : b));
          if (latest.user_id) merged[latest.user_id] = latest;
        }
      }
      setPresenceMap(merged);
    };

    channel.on('presence', { event: 'sync' }, syncPresence);
    channel.on('presence', { event: 'join' }, syncPresence);
    channel.on('presence', { event: 'leave' }, syncPresence);

    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const p = payload as TypingPayload;
      typingListenersRef.current.get(p.conversation_id)?.forEach((fn) => fn(p));
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && userId) {
        await channel.track({ user_id: userId, online_at: Date.now() });
      }
    });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const handleVisibility = () => {
      const ch = channelRef.current;
      if (!ch) return;
      if (document.visibilityState === 'visible') {
        void ch.track({ user_id: userId, online_at: Date.now() });
      } else {
        void ch.untrack();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [userId]);

  const isUserOnline = useCallback(
    (uid: string): boolean => {
      const p = presenceMap[uid];
      if (!p) return false;
      return Date.now() - (p.online_at ?? 0) < 5 * 60 * 1000;
    },
    [presenceMap]
  );

  const broadcastTyping = useCallback(
    (conversationId: string, isTyping: boolean) => {
      const ch = channelRef.current;
      if (!ch || !userId) return;
      void ch.send({
        type: 'broadcast',
        event: 'typing',
        payload: { conversation_id: conversationId, user_id: userId, is_typing: isTyping },
      });
    },
    [userId]
  );

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const useTypingBroadcast = (conversationId: string | null): TypingPayload[] => {
    const [typing, setTyping] = useState<TypingPayload[]>([]);

    useEffect(() => {
      if (!conversationId) { setTyping([]); return; }

      const handler = (payload: TypingPayload) => {
        setTyping((prev) => {
          const filtered = prev.filter((p) => p.user_id !== payload.user_id);
          return payload.is_typing ? [...filtered, payload] : filtered;
        });
        if (payload.is_typing) {
          setTimeout(() => {
            setTyping((prev) => prev.filter((p) => p.user_id !== payload.user_id));
          }, 5000);
        }
      };

      if (!typingListenersRef.current.has(conversationId)) {
        typingListenersRef.current.set(conversationId, new Set());
      }
      typingListenersRef.current.get(conversationId)!.add(handler);

      return () => {
        typingListenersRef.current.get(conversationId)?.delete(handler);
        setTyping([]);
      };
    }, [conversationId]);

    return typing;
  };

  return (
    <PresenceContext.Provider value={{ isUserOnline, presenceMap, broadcastTyping, useTypingBroadcast }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error('usePresence must be used inside <PresenceProvider>');
  return ctx;
}
