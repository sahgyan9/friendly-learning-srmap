
import { supabase } from '../client';
import type { Message, Conversation } from '@/types/chat';

// Get or create a conversation between two users
export async function getOrCreateConversation(user1Id: string, user2Id: string) {
  try {
    // First check if a conversation already exists
    const { data, error } = await supabase.rpc(
      'get_conversation', 
      { user1: user1Id, user2: user2Id }
    ) as unknown as { 
      data: Conversation[] | null, 
      error: Error | null 
    };

    if (error) {
      console.error('Error searching for conversation:', error);
      return { data: null, error };
    }

    if (data && Array.isArray(data) && data.length > 0) {
      return { data: data[0] as Conversation, error: null };
    }

    // If no conversation exists, create a new one
    const { data: newConversation, error: createError } = await supabase.rpc(
      'create_conversation',
      { user1_id: user1Id, user2_id: user2Id }
    ) as unknown as {
      data: Conversation | null,
      error: Error | null
    };

    return { 
      data: newConversation as Conversation, 
      error: createError 
    };
  } catch (err) {
    console.error('Exception in getOrCreateConversation:', err);
    return { data: null, error: err as Error };
  }
}

// Get messages for a conversation
export async function getConversationMessages(conversationId: string) {
  try {
    const { data, error } = await supabase.rpc(
      'get_conversation_messages', 
      { conversation_id: conversationId }
    ) as unknown as {
      data: Message[] | null,
      error: Error | null
    };

    return { 
      data: data as Message[], 
      error 
    };
  } catch (err) {
    console.error('Exception in getConversationMessages:', err);
    return { data: null, error: err as Error };
  }
}

// Send a message in a conversation
export async function sendMessage(conversationId: string, senderId: string, receiverId: string, content: string) {
  try {
    // Insert the message
    const { data, error: messageError } = await supabase.rpc(
      'send_message',
      {
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        content: content
      }
    ) as unknown as {
      data: Message | null,
      error: Error | null
    };

    if (messageError) {
      console.error('Error sending message:', messageError);
      return { data: null, error: messageError };
    }

    // Update the conversation with the last message
    const { error: updateError } = await supabase.rpc(
      'update_conversation',
      {
        conversation_id: conversationId,
        last_message: content
      }
    ) as unknown as {
      error: Error | null
    };

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    return { 
      data: data as Message, 
      error: updateError 
    };
  } catch (err) {
    console.error('Exception in sendMessage:', err);
    return { data: null, error: err as Error };
  }
}

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    const { data, error } = await supabase.rpc(
      'get_user_conversations', 
      { user_id: userId }
    ) as unknown as {
      data: Conversation[] | null,
      error: Error | null
    };

    return { 
      data: data as Conversation[], 
      error 
    };
  } catch (err) {
    console.error('Exception in getUserConversations:', err);
    return { data: null, error: err as Error };
  }
}

// Mark messages as read
export async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase.rpc(
      'mark_messages_as_read',
      {
        conversation_id: conversationId,
        user_id: userId
      }
    ) as unknown as {
      data: Message[] | null,
      error: Error | null
    };

    return { data, error };
  } catch (err) {
    console.error('Exception in markMessagesAsRead:', err);
    return { error: err as Error };
  }
}
