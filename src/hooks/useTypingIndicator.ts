
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { updateTypingIndicator } from '@/integrations/supabase/services/realtime';
import { useRealtimeSubscription } from './useRealtime';

interface TypingUser {
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}

export const useTypingIndicator = (conversationId: string | null, userId: string) => {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Subscribe to typing indicator changes
  useRealtimeSubscription(
    'typing_indicators',
    useCallback((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const typingData = payload.new as TypingUser;
        
        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.user_id !== typingData.user_id);
          if (typingData.is_typing) {
            return [...filtered, typingData];
          }
          return filtered;
        });
      } else if (payload.eventType === 'DELETE') {
        const deletedData = payload.old as TypingUser;
        setTypingUsers(prev => prev.filter(user => user.user_id !== deletedData.user_id));
      }
    }, []),
    conversationId ? { column: 'conversation_id', value: conversationId } : undefined
  );

  // Clean up old typing indicators
  useEffect(() => {
    const cleanup = setInterval(() => {
      setTypingUsers(prev => 
        prev.filter(user => {
          const updatedTime = new Date(user.updated_at).getTime();
          const now = Date.now();
          return now - updatedTime < 10000; // Remove indicators older than 10 seconds
        })
      );
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  const startTyping = useCallback(async () => {
    if (!conversationId || isTyping) return;

    setIsTyping(true);
    await updateTypingIndicator(conversationId, userId, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  }, [conversationId, userId, isTyping]);

  const stopTyping = useCallback(async () => {
    if (!conversationId || !isTyping) return;

    setIsTyping(false);
    await updateTypingIndicator(conversationId, userId, false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, [conversationId, userId, isTyping]);

  const refreshTyping = useCallback(() => {
    if (isTyping) {
      startTyping();
    }
  }, [isTyping, startTyping]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (conversationId && isTyping) {
        updateTypingIndicator(conversationId, userId, false);
      }
    };
  }, [conversationId, userId, isTyping]);

  // Filter out current user from typing users
  const otherTypingUsers = typingUsers.filter(user => user.user_id !== userId);

  return {
    typingUsers: otherTypingUsers,
    isTyping,
    startTyping,
    stopTyping,
    refreshTyping
  };
};
