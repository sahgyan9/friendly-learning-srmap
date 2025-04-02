
import { supabase } from '../client';
import { Message, Conversation } from '@/types/chat';

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string) => {
  try {
    // Get all conversations where user is either user1 or user2
    const { data, error } = await supabase
      .from('messages')
      .select(`
        sender_id,
        receiver_id,
        message_text,
        timestamp,
        is_read,
        sender:sender_id(id, name, profile_pic_url),
        receiver:receiver_id(id, name, profile_pic_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('timestamp', { ascending: false });

    if (error) {
      throw error;
    }

    // Group by conversation partner
    const conversations: Record<string, any> = {};
    
    data?.forEach((message) => {
      const partnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;
      
      if (!conversations[partnerId]) {
        const partner = message.sender_id === userId ? message.receiver : message.sender;
        conversations[partnerId] = {
          id: partnerId, // Using partner ID as conversation ID for simplicity
          user1_id: userId,
          user2_id: partnerId,
          user1: null, // Current user
          user2: {
            id: partner?.id,
            name: partner?.name,
            profile_image: partner?.profile_pic_url || `https://ui-avatars.com/api/?name=${partner?.name}&background=6366F1&color=fff`
          },
          last_message: {
            id: message.id,
            conversation_id: partnerId,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            content: message.message_text,
            sent_at: message.timestamp,
            is_read: message.is_read
          },
          last_message_id: message.id,
          last_updated: message.timestamp
        };
      }
    });

    return { data: Object.values(conversations), error: null };
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return { data: null, error };
  }
};

/**
 * Get all messages in a conversation
 */
export const getConversationMessages = async (conversationId: string) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${conversationId},receiver_id.eq.${conversationId}`)
      .order('timestamp', { ascending: true });

    if (error) {
      throw error;
    }

    // Map to our Message type
    const messages = data?.map(msg => ({
      id: msg.id,
      conversation_id: conversationId,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.message_text,
      sent_at: msg.timestamp,
      is_read: msg.is_read
    }));

    return { data: messages, error: null };
  } catch (error) {
    console.error("Error fetching messages:", error);
    return { data: null, error };
  }
};

/**
 * Mark all messages in a conversation as read
 */
export const markMessagesAsRead = async (conversationId: string, userId: string) => {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    if (error) {
      throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return { success: false, error };
  }
};

/**
 * Send a new message
 */
export const sendMessage = async (
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string
) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        message_text: content,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Map to our Message type
    const message: Message = {
      id: data.id,
      conversation_id: conversationId,
      sender_id: data.sender_id,
      receiver_id: data.receiver_id,
      content: data.message_text,
      sent_at: data.timestamp,
      is_read: data.is_read
    };

    return { data: message, error: null };
  } catch (error) {
    console.error("Error sending message:", error);
    return { data: null, error };
  }
};
