
import { supabase } from "@/integrations/supabase/client";
import { Conversation, Message } from "@/types/chat";

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    console.log("Getting conversations for user ID:", userId);
    
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:users!conversations_user1_id_fkey(id, name, profile_image),
        user2:users!conversations_user2_id_fkey(id, name, profile_image)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    console.log(`Retrieved ${conversationsData?.length || 0} conversations for user ${userId}`);

    // If the conversations query returns empty results, try to fetch from users table directly
    if (!conversationsData || conversationsData.length === 0) {
      return { data: [], error: null };
    }

    // Fix any missing user data by fetching directly from the users table
    for (const conversation of conversationsData) {
      // Check and fetch user1 data if missing
      if (!conversation.user1 && conversation.user1_id) {
        const { data: user1Data } = await supabase
          .from('users')
          .select('id, name, profile_image')
          .eq('id', conversation.user1_id)
          .single();
        
        if (user1Data) {
          // Type assertion to match the expected structure
          conversation.user1 = user1Data as any;
        }
      }
      
      // Check and fetch user2 data if missing
      if (!conversation.user2 && conversation.user2_id) {
        const { data: user2Data } = await supabase
          .from('users')
          .select('id, name, profile_image')
          .eq('id', conversation.user2_id)
          .single();
        
        if (user2Data) {
          // Type assertion to match the expected structure
          conversation.user2 = user2Data as any;
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
        
        // Use type assertion to ensure type compatibility
        enhancedConversations.push({
          ...conversation,
          last_message: messageData || undefined
        } as Conversation);
      } else {
        // No last message, just add the conversation as is
        enhancedConversations.push({
          ...conversation,
          last_message: undefined
        } as Conversation);
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
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });
      
    if (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
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
    // First, check if a conversation already exists
    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select('*')
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .single();
      
    if (!findError && existingConversation) {
      console.log('Found existing conversation:', existingConversation);
      return { data: existingConversation, error: null };
    }
    
    if (findError && findError.code !== 'PGRST116') {
      // If error is not "no rows returned", something went wrong
      console.error('Error finding conversation:', findError);
      return { data: null, error: findError };
    }
    
    // No existing conversation, create a new one
    console.log('Creating new conversation between', user1Id, 'and', user2Id);
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
