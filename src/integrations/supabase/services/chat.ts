
import { supabase } from "@/integrations/supabase/client";
import { Conversation, Message } from "@/types/chat";

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    console.log("Getting conversations for user ID:", userId);

    // First fetch user's own data to ensure it's available
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
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
      const usersToFetch = new Set<string>();

      conversationsData.forEach(conv => {
        if (!conv.user1 || !conv.user1.name) {
          console.warn(`Missing user1 data for conversation ${conv.id}, user1_id: ${conv.user1_id}`);
          if (conv.user1_id) {
            usersToFetch.add(conv.user1_id);
          }
        }
        if (!conv.user2 || !conv.user2.name) {
          console.warn(`Missing user2 data for conversation ${conv.id}, user2_id: ${conv.user2_id}`);
          if (conv.user2_id) {
            usersToFetch.add(conv.user2_id);
          }
        }
      });

      // Try to fetch any missing user data directly
      if (usersToFetch.size > 0) {
        // Convert Set to Array of strings and filter out non-string values
        const userIds = Array.from(usersToFetch).filter(id => typeof id === 'string') as string[];
        
        if (userIds.length > 0) {
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
        if (!message.sender || !message.sender.name) {
          const sender = usersData.find(user => user.id === message.sender_id);
          if (sender) {
            message.sender = sender;
            console.log(`Added missing sender data for message ${message.id}:`, sender.name);
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
    } else if (senderData) {
      // Attach sender data to the message
      messageData.sender = senderData;
    }

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

    return { data: messageData, error: null };
  } catch (err) {
    console.error('Exception in sendMessage:', err);
    return { data: null, error: err as Error };
  }
}

// Get or create a conversation between two users
export async function getOrCreateConversation(user1Id: string, user2Id: string) {
  try {
    // First check if conversation exists
    const { data: existingConversations, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .limit(1);

    if (fetchError) {
      console.error('Error checking for existing conversation:', fetchError);
      return { data: null, error: fetchError };
    }

    // If conversation exists, return it
    if (existingConversations && existingConversations.length > 0) {
      return { data: existingConversations[0], error: null };
    }

    // If no conversation exists, create a new one
    const { data: newConversation, error: createError } = await supabase
      .from('conversations')
      .insert({
        user1_id: user1Id,
        user2_id: user2Id,
        last_updated: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating conversation:', createError);
      return { data: null, error: createError };
    }

    return { data: newConversation, error: null };
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
