
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
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    console.log(`Retrieved ${conversationsData?.length || 0} conversations`);

    // Fetch the last message separately for each conversation
    const enhancedConversations: Conversation[] = [];
    
    for (const conversation of conversationsData || []) {
      // If there's a last_message_id, fetch that specific message
      if (conversation.last_message_id) {
        const { data: messageData, error: messageError } = await supabase
          .from('messages')
          .select('*')
          .eq('id', conversation.last_message_id)
          .maybeSingle();
          
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
    
    if (error) {
      console.error('Error marking messages as read:', error);
    } else {
      console.log(`Marked ${data?.length || 0} messages as read`);
    }
    
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
    console.log(`Sending message in conversation ${conversationId} from ${senderId} to ${receiverId}`);
    
    // 1. Insert the message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        receiver_id: receiverId,
        content,
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

    console.log('Message sent successfully:', messageData);

    // 2. Update the conversation's last_message_id and last_updated
    const { error: conversationError } = await supabase
      .from('conversations')
      .update({ 
        last_message_id: messageData.id,
        last_updated: new Date().toISOString()
      })
      .eq('id', conversationId);
      
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
    console.log(`Looking for conversation between ${user1Id} and ${user2Id}`);
    
    // First, check if a conversation already exists
    const { data: existingConversation, error: findError } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:users!conversations_user1_id_fkey(id, name, profile_image),
        user2:users!conversations_user2_id_fkey(id, name, profile_image)
      `)
      .or(`and(user1_id.eq.${user1Id},user2_id.eq.${user2Id}),and(user1_id.eq.${user2Id},user2_id.eq.${user1Id})`)
      .maybeSingle();
      
    if (findError && findError.code !== 'PGRST116') {
      // If error is not "no rows returned", something went wrong
      console.error('Error finding conversation:', findError);
      return { data: null, error: findError };
    }
    
    if (existingConversation) {
      console.log('Found existing conversation:', existingConversation);
      return { data: existingConversation, error: null };
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
      .select(`
        *,
        user1:users!conversations_user1_id_fkey(id, name, profile_image),
        user2:users!conversations_user2_id_fkey(id, name, profile_image)
      `)
      .single();
      
    if (createError) {
      console.error('Error creating conversation:', createError);
      return { data: null, error: createError };
    }
    
    console.log('Created new conversation:', newConversation);
    return { data: newConversation, error: null };
  } catch (err) {
    console.error('Exception in getOrCreateConversation:', err);
    return { data: null, error: err as Error };
  }
}
