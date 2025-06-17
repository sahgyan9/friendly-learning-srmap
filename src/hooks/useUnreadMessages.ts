
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Fetch initial unread count
    const fetchUnreadCount = async () => {
      try {
        const { count, error } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false);

        if (error) {
          console.error('Error fetching unread messages count:', error);
          return;
        }

        setUnreadCount(count || 0);
      } catch (err) {
        console.error('Exception fetching unread messages count:', err);
      }
    };

    fetchUnreadCount();

    // Subscribe to real-time message updates
    const channel = supabase
      .channel('unread-messages-tracker')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        () => {
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`
        },
        (payload) => {
          const newMessage = payload.new;
          const oldMessage = payload.old;
          
          // If message was marked as read
          if (oldMessage.is_read === false && newMessage.is_read === true) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
          // If message was marked as unread (unlikely but possible)
          else if (oldMessage.is_read === true && newMessage.is_read === false) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return unreadCount;
};
