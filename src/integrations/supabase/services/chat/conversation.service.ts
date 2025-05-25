import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/chat";

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    console.log("Getting conversations for user ID:", userId);

    // First, get the conversations without the embedded user data
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        user1_id,
        user2_id,
        last_message_id,
        last_updated
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    console.log(`Retrieved ${conversationsData?.length || 0} conversations for user ${userId}`);

    // Now fetch the user data and last messages for each conversation
    const enhancedConversations = await Promise.all(
      (conversationsData || []).map(async (conv) => {
        // Fetch user1 data
        const { data: user1Data, error: user1Error } = await supabase
          .from('users')
          .select('id, name, profile_image, role')
          .eq('id', conv.user1_id)
          .single();

        // Fetch user2 data
        const { data: user2Data, error: user2Error } = await supabase
          .from('users')
          .select('id, name, profile_image, role')
          .eq('id', conv.user2_id)
          .single();

        // Handle missing user data with proper fallbacks
        const user1 = user1Error || !user1Data ? {
          id: conv.user1_id || '',
          name: 'Unknown User',
          profile_image: null,
          role: 'user'
        } : user1Data;

        const user2 = user2Error || !user2Data ? {
          id: conv.user2_id || '',
          name: 'Unknown User',
          profile_image: null,
          role: 'user'
        } : user2Data;

        // Fetch the last message if it exists
        let lastMessage = undefined;
        if (conv.last_message_id) {
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', conv.last_message_id)
            .single();

          if (messageError) {
            console.error(`Error fetching last message for conversation ${conv.id}:`, messageError);
          } else {
            lastMessage = messageData;
          }
        }

        console.log(`Conversation ${conv.id} - user1: ${user1.name}, user2: ${user2.name}`);

        return {
          ...conv,
          user1,
          user2,
          last_message: lastMessage
        };
      })
    );

    return { data: enhancedConversations, error: null };
  } catch (err) {
    console.error('Exception in getUserConversations:', err);
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
