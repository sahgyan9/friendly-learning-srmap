import { supabase } from "@/integrations/supabase/client";
import { Conversation, Message } from "@/types/chat";

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    console.log("Getting conversations for user ID:", userId);

    // First fetch user's own data to ensure it's available
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, profile_image')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
    } else {
      console.log('Current user data:', userData);
    }

    // Then fetch conversations with complete user data
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:users!conversations_user1_id_fkey(id, name, profile_image, role),
        user2:users!conversations_user2_id_fkey(id, name, profile_image, role)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    console.log(`Retrieved ${conversationsData?.length || 0} conversations for user ${userId}`);

    // Check if any user data is missing and log it
    if (conversationsData) {
      const usersToFetch = new Set();

      conversationsData.forEach(conv => {
        if (!conv.user1 || !conv.user1.name) {
          console.warn(`Missing user1 data for conversation ${conv.id}, user1_id: ${conv.user1_id}`);
          usersToFetch.add(conv.user1_id);
        }
        if (!conv.user2 || !conv.user2.name) {
          console.warn(`Missing user2 data for conversation ${conv.id}, user2_id: ${conv.user2_id}`);
          usersToFetch.add(conv.user2_id);
        }
      });

      // Try to fetch any missing user data directly
      if (usersToFetch.size > 0) {
        const userIds = Array.from(usersToFetch);
        console.log('Fetching missing user data for:', userIds);

        const { data: missingUsers, error: missingUsersError } = await supabase
          .from('users')
          .select('id, name, profile_image, role')
          .in('id', userIds);

        if (missingUsersError) {
          console.error('Error fetching missing user data:', missingUsersError);
        } else if (missingUsers) {
          console.log('Retrieved missing user data:', missingUsers);

          // Update the conversation data with the missing user info
          missingUsers.forEach(user => {
            conversationsData.forEach(conv => {
              if (conv.user1_id === user.id && (!conv.user1 || !conv.user1.name)) {
                conv.user1 = user;
              }
              if (conv.user2_id === user.id && (!conv.user2 || !conv.user2.name)) {
                conv.user2 = user;
              }
            });
          });
        }
      }
    }

    // Fetch the last message separately for each conversation
    const enhancedConversations: Conversation[] = [];

    for (const conversation of conversationsData || []) {
      // If there's a last_message_id, fetch that specific message
      if (conversation.last_message_id) {
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .eq('id', conversation.last_message_id)
          .single();

        if (messageError) {
          console.error(`Error fetching last message for conversation ${conversation.id}:`, messageError);
        }

        enhancedConversations.push({
          ...conversation,
          last_message: messageData || undefined
        });
      } else {
        // No last message, just add the conversation as is
        enhancedConversations.push({
          ...conversation,
          last_message: undefined
        });
      }
    }

    return { data: enhancedConversations, error: null };
  } catch (err) {
    console.error('Exception in getUserConversations:', err);
    return { data: null, error: err as Error };
  }
}

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

    // Then fetch messages specifically for this conversation only
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, name, profile_image)
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

    // 2. Update the conversation's last_message_id and last_updated
    const { data: conversationData, error: conversationError } = await supabase
      .rpc('update_conversation', {
        conversation_id: conversationId,
        message_id: messageData.id
      });

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
      // We still return the message data even if conversation update fails
    }

    return { data: messageData, error: null };
  } catch (err) {
    console.error('Exception in sendMessage:', err);
    return { data: null, error: err as Error };
  }
}

// Get or create a conversation between two users
export async function getOrCreateConversation(user1Id: string, user2Id: string) {
  try {
    const { data: conversationId, error } = await supabase.rpc('update_conversation', {
      user1: user1Id,
      user2: user2Id
    });

    if (error) {
      console.error('Error in update_conversation:', error);
      return { data: null, error };
    }

    // Fetch the full conversation object if needed
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    return { data: conversation, error: fetchError || null };
  } catch (err) {
    console.error('Exception in getOrCreateConversation:', err);
    return { data: null, error: err as Error };
  }
}

// Get user data by ID
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in getUserById:', err);
    return { data: null, error: err as Error };
  }
}
