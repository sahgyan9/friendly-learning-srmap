
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateUserPresence } from '@/integrations/supabase/services/realtime';

export const useUserPresence = (userId: string) => {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!userId) return;

    // Set user as online when component mounts
    updateUserPresence(userId, true);

    // Update presence every 30 seconds
    intervalRef.current = setInterval(() => {
      updateUserPresence(userId, true);
    }, 30000);

    // Handle page visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserPresence(userId, true);
      } else {
        updateUserPresence(userId, false);
      }
    };

    // Handle beforeunload to set user offline
    const handleBeforeUnload = () => {
      updateUserPresence(userId, false);
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
      updateUserPresence(userId, false);
    };
  }, [userId]);
};

export const useRealtimeSubscription = (
  table: string,
  callback: (payload: any) => void,
  filter?: { column: string; value: string }
) => {
  useEffect(() => {
    let channel = supabase.channel(`realtime-${table}`);

    if (filter) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `${filter.column}=eq.${filter.value}`
        },
        callback
      );
    } else {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table
        },
        callback
      );
    }

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback, filter]);
};
