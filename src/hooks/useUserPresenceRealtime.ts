
import { usePresence } from '@/context/PresenceContext';

/**
 * @migration complete
 * Previously subscribed to public.user_presence table changes via postgres_changes.
 * Now reads from the in-memory WebSocket Presence state in PresenceContext.
 * Zero DB queries, zero WAL, instant updates via channel.track().
 */
export const useUserPresenceRealtime = () => {
  const { isUserOnline, presenceMap } = usePresence();

  return {
    userPresences: presenceMap,
    isUserOnline,
    // kept for API compatibility with existing call sites
    getUserPresence: (userId: string) => presenceMap[userId] ?? null,
  };
};
