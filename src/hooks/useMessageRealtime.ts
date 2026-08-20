
import { useEffect, useCallback } from 'react';
import { Message, Conversation } from '@/types/chat';
import { useRealtimeSubscription } from './useRealtime';
import { markMessagesDelivered } from '@/integrations/supabase/services/realtime';

export const useMessageRealtime = (
  activeChat: string | null,
  userId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void,
  onConversationUpdate: (conversation: Conversation) => void
) => {
  // Subscribe to new messages
  useRealtimeSubscription(
    'messages',
    useCallback((payload) => {
      if (payload.eventType === 'INSERT') {
        const newMessage = payload.new as Message;
        
        onNewMessage(newMessage);
        
        // If message is for the current user and they're viewing the conversation, mark as delivered
        if (newMessage.receiver_id === userId && newMessage.conversation_id === activeChat) {
          markMessagesDelivered(newMessage.conversation_id, userId);
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedMessage = payload.new as Message;
        onMessageUpdate(updatedMessage);
      }
    }, [activeChat, userId, onNewMessage, onMessageUpdate])
  );

  // Subscribe to conversation updates
  useRealtimeSubscription(
    'conversations',
    useCallback((payload) => {
      if (payload.eventType === 'UPDATE') {
        const updatedConversation = payload.new as Conversation;
        onConversationUpdate(updatedConversation);
      }
    }, [onConversationUpdate])
  );

  // Mark messages as delivered when viewing a conversation
  useEffect(() => {
    if (activeChat && userId) {
      markMessagesDelivered(activeChat, userId);
    }
  }, [activeChat, userId]);
};
