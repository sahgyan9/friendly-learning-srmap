
import { supabase } from "@/integrations/supabase/client";
import { Message } from "@/types/chat";

// Get conversation messages
export async function getConversationMessages(conversationId: string) {
  try {
    // First, get the conversation details to verify participants
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('Error fetching conversation details:', convError);
      return { data: null, error: convError };
    }

    if (!conversation) {
      console.error('Conversation not found:', conversationId);
      return { data: null, error: new Error('Conversation not found') };
    }

    // Get the valid participant IDs
    const validParticipants = [conversation.user1_id, conversation.user2_id];

    // Fetch users data first to ensure we have sender information
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .in('id', validParticipants);

    if (usersError) {
      console.error('Error fetching users data:', usersError);
    } else {
      console.log('Fetched users for conversation:', usersData);
    }

    // Then fetch messages specifically for this conversation only
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, profile_image, role)
      `)
      .eq('conversation_id', conversationId)
      .in('sender_id', validParticipants)
      .in('receiver_id', validParticipants)
      .order('sent_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
    }

    console.log(`Retrieved ${data?.length || 0} messages for conversation ${conversationId}`);
    
    // If some messages are missing sender information, try to fill it in from the users we fetched
    if (data && usersData) {
      data.forEach(message => {
        const senderData = usersData.find(user => user.id === message.sender_id);

        if (senderData) {
          // Sender data found in usersData
          if (!message.sender) {
            // Ensure role is included, default if not present in senderData for some reason
            message.sender = { 
              ...senderData, 
              name: senderData.name?.trim() || "Unknown User",
              role: senderData.role || 'user' 
            };
          } else {
            message.sender.name = senderData.name?.trim() || "Unknown User";
            // Ensure other fields are present if message.sender was minimal
            message.sender.profile_image = message.sender.profile_image || senderData.profile_image || null;
            message.sender.id = message.sender.id || senderData.id;
            message.sender.role = message.sender.role || senderData.role || 'user';
          }
          if (!message.sender.name) { // Double check if name ended up empty after trim
            message.sender.name = "Unknown User";
          }
          console.log(`Updated sender data for message ${message.id}:`, message.sender.name);
        } else {
          // Sender data not found in usersData
          if (!message.sender) {
            message.sender = { id: message.sender_id, name: "Unknown User", profile_image: null, role: 'user' };
          } else {
            message.sender.name = message.sender.name?.trim() || "Unknown User";
            message.sender.role = message.sender.role || 'user'; // Ensure role if sender object existed but was incomplete
            if (!message.sender.name) { // Double check if name ended up empty after trim
                message.sender.name = "Unknown User";
            }
          }
          console.log(`Sender data not found for message ${message.id}. Set to "Unknown User".`);
        }
      });
    }

    // Final check for sender names
    if (data) {
      data.forEach(message => {
        if (!message.sender || !message.sender.name || message.sender.name === "Contact") {
          console.warn("Failed to resolve sender name for message:", message.id);
          // Ensure sender object and name are populated to avoid downstream errors
          if (!message.sender) {
            message.sender = { id: message.sender_id, name: "Unknown User", profile_image: null, role: 'user' };
          } else {
            message.sender.name = "Unknown User";
            message.sender.role = message.sender.role || 'user'; // Ensure role if sender object existed but was incomplete
          }
        }
      });
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in getConversationMessages:', err);
    return { data: null, error: err as Error };
  }
}

// Mark messages as read
export async function markMessagesAsRead(conversationId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false);

    return { data, error };
  } catch (err) {
    console.error('Exception in markMessagesAsRead:', err);
    return { data: null, error: err as Error };
  }
}

// Send a message
export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string
) {
  try {
    // Verify that the sender and receiver are valid participants in this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user1_id, user2_id')
      .eq('id', conversationId)
      .single();

    if (convError) {
      console.error('Error fetching conversation details:', convError);
      return { data: null, error: convError };
    }

    if (!conversation) {
      console.error('Conversation not found:', conversationId);
      return { data: null, error: new Error('Conversation not found') };
    }

    // Validate that both users are participants in this conversation
    const validParticipants = [conversation.user1_id, conversation.user2_id];
    if (!validParticipants.includes(senderId) || !validParticipants.includes(receiverId)) {
      const error = new Error('Invalid participants for this conversation');
      console.error(error.message, { senderId, receiverId, validParticipants });
      return { data: null, error };
    }

    // 1. Insert the message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
        sent_at: new Date().toISOString(),
        is_read: false
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error sending message:', messageError);
      return { data: null, error: messageError };
    }

    if (!messageData) {
      console.error('No data returned after sending message');
      return { data: null, error: new Error('No data returned after sending message') };
    }

    // Get sender information to attach to the message
    const { data: senderData, error: senderError } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .eq('id', senderId)
      .single();

    if (senderError) {
      console.error('Error fetching sender data:', senderError);
    } 

    // Create a new message object that includes the sender information
    const messageWithSender = {
      ...messageData,
      sender: senderData || null
    };

    // 2. Update the conversation's last_message_id and last_updated
    const { error: conversationError } = await supabase
      .rpc('update_conversation', {
        conversation_id: conversationId,
        message_id: messageData.id
      });

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
      // We still return the message data even if conversation update fails
    }

    return { data: messageWithSender, error: null };
  } catch (err) {
    console.error('Exception in sendMessage:', err);
    return { data: null, error: err as Error };
  }
}
