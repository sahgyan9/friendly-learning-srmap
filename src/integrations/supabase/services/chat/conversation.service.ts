
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/chat";

// Get all conversations for a user using direct query with proper joins
export async function getUserConversations(userId: string) {
  try {
    console.log("Getting conversations for user ID:", userId);

    // Fetch conversations with complete user data using joins
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        *,
        user1:users!conversations_user1_id_fkey(id, name, profile_image, role),
        user2:users!conversations_user2_id_fkey(id, name, profile_image, role),
        last_message:messages(id, content, sent_at)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    console.log(`Retrieved ${conversationsData?.length || 0} conversations for user ${userId}`);

    // Ensure user data exists for all conversations
    const validConversations: Conversation[] = (conversationsData || []).map(conv => {
      // Provide fallback user data if missing
      if (!conv.user1 || !conv.user1.name) {
        conv.user1 = {
          id: conv.user1_id || '',
          name: 'User',
          profile_image: null,
          role: 'user'
        };
      }
      if (!conv.user2 || !conv.user2.name) {
        conv.user2 = {
          id: conv.user2_id || '',
          name: 'User', 
          profile_image: null,
          role: 'user'
        };
      }

      return {
        ...conv,
        last_message: conv.last_message?.[0] || undefined
      };
    });

    return { data: validConversations, error: null };
  } catch (err) {
    console.error('Exception in getUserConversations:', err);
    return { data: null, error: err as Error };
  }
}

// Get or create a conversation between two users
export async function getOrCreateConversation(user1Id: string, user2Id: string) {
  try {
    // First check if conversation exists using RPC
    const { data: existingConversations, error: fetchError } = await supabase.rpc('get_conversation', {
      user1: user1Id,
      user2: user2Id
    });

    if (fetchError) {
      console.error('Error checking for existing conversation:', fetchError);
      return { data: null, error: fetchError };
    }

    // If conversation exists, return it
    if (existingConversations && existingConversations.length > 0) {
      return { data: existingConversations[0], error: null };
    }

    // If no conversation exists, create a new one using RPC
    const { data: newConversation, error: createError } = await supabase.rpc('create_conversation', {
      user1_id: user1Id,
      user2_id: user2Id
    });

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
