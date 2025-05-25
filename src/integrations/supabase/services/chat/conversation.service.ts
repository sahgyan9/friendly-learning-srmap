
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/chat";

// Get all conversations for a user
export async function getUserConversations(userId: string) {
  try {
    console.log("Getting conversations for user ID:", userId);

    // Use a more explicit query with LEFT JOINs to ensure we get user data
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        user1_id,
        user2_id,
        last_message_id,
        last_updated,
        user1:user1_id(id, name, profile_image, role),
        user2:user2_id(id, name, profile_image, role)
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    console.log(`Retrieved ${conversationsData?.length || 0} conversations for user ${userId}`);

    // For any missing user data, fetch it directly
    const enhancedConversations = await Promise.all(
      (conversationsData || []).map(async (conv) => {
        let user1Data = conv.user1;
        let user2Data = conv.user2;

        // If user1 data is missing or incomplete, fetch it directly
        if (!user1Data || !user1Data.name) {
          console.log(`Fetching missing user1 data for conversation ${conv.id}, user1_id: ${conv.user1_id}`);
          const { data: fetchedUser1, error: user1Error } = await supabase
            .from('users')
            .select('id, name, profile_image, role')
            .eq('id', conv.user1_id)
            .single();

          if (user1Error) {
            console.error(`Error fetching user1 data for ${conv.user1_id}:`, user1Error);
            user1Data = {
              id: conv.user1_id || '',
              name: 'Unknown User',
              profile_image: null,
              role: 'user'
            };
          } else {
            user1Data = fetchedUser1;
          }
        }

        // If user2 data is missing or incomplete, fetch it directly
        if (!user2Data || !user2Data.name) {
          console.log(`Fetching missing user2 data for conversation ${conv.id}, user2_id: ${conv.user2_id}`);
          const { data: fetchedUser2, error: user2Error } = await supabase
            .from('users')
            .select('id, name, profile_image, role')
            .eq('id', conv.user2_id)
            .single();

          if (user2Error) {
            console.error(`Error fetching user2 data for ${conv.user2_id}:`, user2Error);
            user2Data = {
              id: conv.user2_id || '',
              name: 'Unknown User',
              profile_image: null,
              role: 'user'
            };
          } else {
            user2Data = fetchedUser2;
          }
        }

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

        return {
          ...conv,
          user1: user1Data,
          user2: user2Data,
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
