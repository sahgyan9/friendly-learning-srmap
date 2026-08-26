
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

// Get messages for a conversation using RPC function
export async function getConversationMessages(conversationId: string) {
  try {
    
    const { data, error } = await supabase.rpc('get_conversation_messages', {
      conversation_id: conversationId
    });

    if (error) {
      console.error('Error fetching conversation messages:', error);
      return { data: null, error };
    }

    // Fetch sender data for each message
    const messagesWithSenders: Message[] = [];
    const senderCache = new Map<string, any>();
    
    for (const message of data || []) {
      let senderData = null;
      
      if (message.sender_id) {
        if (senderCache.has(message.sender_id)) {
          senderData = senderCache.get(message.sender_id);
        } else {
          const { data: sender, error: senderError } = await supabase
            .from('users')
            .select('id, name, profile_image')
            .eq('id', message.sender_id)
            .maybeSingle();

          if (!senderError && sender) {
            senderData = sender;
            senderCache.set(message.sender_id, sender);
          }
        }
      }

      // Ensure delivery_status is properly typed
      const deliveryStatus = message.delivery_status as 'sent' | 'delivered' | 'read' || 'sent';

      messagesWithSenders.push({
        ...message,
        delivery_status: deliveryStatus,
        sender: senderData,
        reply_to_id: (message as any).reply_to_id || null,
        reply_to: null,
        is_edited: Boolean((message as any).is_edited),
        edited_at: (message as any).edited_at || null,
      });
    }

    // Hydrate reply_to details from earlier/loaded messages in the conversation
    const messageLookup = new Map<string, { id: string; sender_name: string; content: string }>();
    for (const msg of messagesWithSenders) {
      messageLookup.set(msg.id, {
        id: msg.id,
        sender_name: msg.sender?.name?.trim() || 'User',
        content: msg.content,
      });
    }
    for (const msg of messagesWithSenders) {
      if (msg.reply_to_id && messageLookup.has(msg.reply_to_id)) {
        msg.reply_to = messageLookup.get(msg.reply_to_id) ?? null;
      }
    }

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
  content: string,
  replyToId?: string | null
) {
  try {
    const params: Record<string, any> = {
      p_conversation_id: conversationId,
      p_sender_id: senderId,
      p_receiver_id: receiverId,
      p_content: content,
    };
    if (replyToId) {
      params.p_reply_to_id = replyToId;
    }

    let { data, error } = await (supabase.rpc as any)('send_message', params);

    // Fallback if remote DB hasn't yet deployed the 5-arg RPC
    if (error && replyToId && (error.message?.includes('p_reply_to_id') || error.code === '42883')) {
      const fallback = await (supabase.rpc as any)('send_message', {
        p_conversation_id: conversationId,
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_content: content,
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) {
      console.error('RPC send_message error:', error);
      return { data: null, error };
    }

    // Dispatch instant background push notification to recipient
    try {
      import("@/lib/push/pushService").then(({ dispatchPushNotification }) => {
        dispatchPushNotification({
          userIds: [receiverId],
          title: "New Message",
          body: content.length > 80 ? content.slice(0, 77) + "..." : content,
          url: `/chat?conversation=${conversationId}`,
          tag: `chat-${conversationId}`,
        }).catch(() => {});
      });
    } catch {
      // Fire-and-forget
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in sendMessage:', err);
    return { data: null, error: err as Error };
  }
}

// Edit a direct message within 30 minutes
export async function editDirectMessage(messageId: string, content: string) {
  try {
    const { data, error } = await (supabase.rpc as any)('edit_direct_message', {
      p_message_id: messageId,
      p_content: content,
    });

    if (error) {
      console.error('RPC edit_direct_message error:', error);
      return { data: null, error };
    }

    return { data: data as Message, error: null };
  } catch (err) {
    console.error('Exception in editDirectMessage:', err);
    return { data: null, error: err as Error };
  }
}

// Delete a direct message within 30 minutes
export async function deleteDirectMessage(messageId: string) {
  try {
    const { data, error } = await (supabase.rpc as any)('delete_direct_message', {
      p_message_id: messageId,
    });

    if (error) {
      console.error('RPC delete_direct_message error:', error);
      return { data: null, error };
    }

    return { data: Boolean(data), error: null };
  } catch (err) {
    console.error('Exception in deleteDirectMessage:', err);
    return { data: false, error: err as Error };
  }
}

// Mark messages as read using RPC function
export async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    
    const { data, error } = await supabase.rpc('mark_messages_as_read', {
      conversation_id: conversationId,
      user_id: userId
    });

    if (error) {
      console.error('Error marking messages as read:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in markMessagesAsRead:', err);
    return { data: null, error: err as Error };
  }
}
