
import { useEffect, useCallback } from 'react';
import { Message, Conversation } from '@/types/chat';
import { useRealtimeSubscription } from './useRealtime';
import { markMessagesDelivered } from '@/integrations/supabase/services/realtime';

export const useMessageRealtime = (
  activeChat: string | null,
  userId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate: (message: Message) => void,
  onConversationUpdate: (conversation: Conversation) => void,
  onMessageDelete?: (messageId: string) => void,
  onReactionChange?: () => void,
) => {
  // Subscribe to message events (insert, update, delete)
  useRealtimeSubscription(
    'messages',
    useCallback((payload) => {
      if (payload.eventType === 'INSERT') {
        const newMessage = payload.new as unknown as Message;
        
        onNewMessage(newMessage);
        
        // If message is for the current user and they're viewing the conversation, mark as delivered
        if (newMessage.receiver_id === userId && newMessage.conversation_id === activeChat) {
          markMessagesDelivered(newMessage.conversation_id, userId);
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedMessage = payload.new as unknown as Message;
        onMessageUpdate(updatedMessage);
      } else if (payload.eventType === 'DELETE') {
        const deletedId = (payload.old as { id?: string })?.id;
        if (deletedId) {
          onMessageDelete?.(deletedId);
        }
      }
    }, [activeChat, userId, onNewMessage, onMessageUpdate, onMessageDelete])
  );

  // Subscribe to direct message reactions
  useRealtimeSubscription(
    'direct_message_reactions',
    useCallback(() => {
      onReactionChange?.();
    }, [onReactionChange])
  );

  // Subscribe to conversation updates
  useRealtimeSubscription(
    'conversations',
    useCallback((payload) => {
      if (payload.eventType === 'UPDATE') {
        const updatedConversation = payload.new as unknown as Conversation;
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
