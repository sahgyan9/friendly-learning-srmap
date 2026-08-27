
import { useState, useRef, useCallback } from 'react';
import { usePresence } from '@/context/PresenceContext';

/**
 * @migration complete
 * Previously wrote to public.typing_indicators via update_typing_indicator RPC.
 * Now uses Supabase Realtime Broadcast via PresenceContext.broadcastTyping().
 * Zero DB queries, zero WAL, instant delivery over the shared WebSocket channel.
 */
export const useTypingIndicator = (conversationId: string | null, userId: string) => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const { broadcastTyping, useTypingBroadcast } = usePresence();

  // Receive typing events from other users in this conversation via Broadcast
  const typingPayloads = useTypingBroadcast(conversationId);
  const otherTypingUsers = typingPayloads.filter((p) => p.user_id !== userId);

  const startTyping = useCallback(() => {
    if (!conversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping(conversationId, true);
    }

    // Reset the stop-typing timer on every keystroke
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 3000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isTyping, broadcastTyping]);

  const stopTyping = useCallback(() => {
    if (!conversationId || !isTyping) return;
    setIsTyping(false);
    broadcastTyping(conversationId, false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  }, [conversationId, isTyping, broadcastTyping]);

  const refreshTyping = useCallback(() => {
    if (isTyping) startTyping();
  }, [isTyping, startTyping]);

  return {
    typingUsers: otherTypingUsers,
    isTyping,
    startTyping,
    stopTyping,
    refreshTyping,
  };
};
