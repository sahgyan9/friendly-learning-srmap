
import { useState, useCallback } from 'react';
import { useRealtimeSubscription } from './useRealtime';

interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  updated_at: string;
}

export const useUserPresenceRealtime = () => {
  const [userPresences, setUserPresences] = useState<Record<string, UserPresence>>({});

  // Subscribe to user presence changes
  useRealtimeSubscription(
    'user_presence',
    useCallback((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const presenceData = payload.new as unknown as UserPresence;
        
        setUserPresences(prev => ({
          ...prev,
          [presenceData.user_id]: presenceData
        }));
      } else if (payload.eventType === 'DELETE') {
        const deletedData = payload.old as unknown as UserPresence;
        setUserPresences(prev => {
          const newPresences = { ...prev };
          delete newPresences[deletedData.user_id];
          return newPresences;
        });
      }
    }, [])
  );

  const getUserPresence = useCallback((userId: string): UserPresence | null => {
    return userPresences[userId] || null;
  }, [userPresences]);

  const isUserOnline = useCallback((userId: string): boolean => {
    const presence = getUserPresence(userId);
    if (!presence) return false;
    
    // Consider user online if they were active in the last 5 minutes
    const lastSeen = new Date(presence.last_seen).getTime();
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);
    
    return presence.is_online && lastSeen > fiveMinutesAgo;
  }, [getUserPresence]);

  return {
    userPresences,
    getUserPresence,
    isUserOnline
  };
};
