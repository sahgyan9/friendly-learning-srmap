
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

// Get messages for a conversation using RPC function
export async function getConversationMessages(conversationId: string) {
  try {
    console.log("Fetching messages for conversation:", conversationId);
    
    const { data, error } = await supabase.rpc('get_conversation_messages', {
      conversation_id: conversationId
    });

    if (error) {
      console.error('Error fetching conversation messages:', error);
      return { data: null, error };
    }

    // Fetch sender data for each message
    const messagesWithSenders: Message[] = [];
    
    for (const message of data || []) {
      let senderData = null;
      
      if (message.sender_id) {
        const { data: sender, error: senderError } = await supabase
          .from('users')
          .select('id, name, profile_image')
          .eq('id', message.sender_id)
          .single();

        if (!senderError && sender) {
          senderData = sender;
        }
      }

      // Ensure delivery_status is properly typed
      const deliveryStatus = message.delivery_status as 'sent' | 'delivered' | 'read' || 'sent';

      messagesWithSenders.push({
        ...message,
        delivery_status: deliveryStatus,
        sender: senderData
      });
    }

    console.log("Successfully fetched messages:", messagesWithSenders.length);
    return { data: messagesWithSenders, error: null };
  } catch (err) {
    console.error('Exception in getConversationMessages:', err);
    return { data: null, error: err as Error };
  }
}

// Send a message using RPC function - email notifications are automatically triggered via database trigger
export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string
) {
  try {
    console.log("Attempting to send message via RPC:", {
      conversationId,
      senderId,
      receiverId,
      contentLength: content.length
    });

    const { data, error } = await supabase.rpc('send_message', {
      p_conversation_id: conversationId,
      p_sender_id: senderId,
      p_receiver_id: receiverId,
      p_content: content
    });

    if (error) {
      console.error('RPC send_message error:', error);
      return { data: null, error };
    }

    console.log('Message sent successfully via RPC:', data);
    console.log('Email notification will be triggered automatically via database trigger');
    
    return { data, error: null };
  } catch (err) {
    console.error('Exception in sendMessage:', err);
    return { data: null, error: err as Error };
  }
}

// Mark messages as read using RPC function
export async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    console.log("Marking messages as read:", { conversationId, userId });
    
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      conversation_id: conversationId,
      user_id: userId
    });

    if (error) {
      console.error('Error marking messages as read:', error);
      return { data: null, error };
    }

    console.log("Messages marked as read successfully");
    return { data, error: null };
  } catch (err) {
    console.error('Exception in markMessagesAsRead:', err);
    return { data: null, error: err as Error };
  }
}
