import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/chat";

// Get all conversations for a user using a simpler approach to avoid relationship conflicts
export async function getUserConversations(userId: string) {
  try {
    // First, fetch conversations without complex joins
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    // Now fetch user data and last messages separately for each conversation
    const conversationsWithDetails: Conversation[] = [];
    
    for (const conv of conversationsData || []) {
      // Fetch user1 data
      const { data: user1Data, error: user1Error } = await supabase
        .from('users')
        .select('id, name, profile_image, role')
        .eq('id', conv.user1_id)
        .maybeSingle();

      if (user1Error) {
        console.error(`Error fetching user1 data for ${conv.user1_id}:`, user1Error);
      }

      // Fetch user2 data
      const { data: user2Data, error: user2Error } = await supabase
        .from('users')
        .select('id, name, profile_image, role')
        .eq('id', conv.user2_id)
        .maybeSingle();

      if (user2Error) {
        console.error(`Error fetching user2 data for ${conv.user2_id}:`, user2Error);
      }

      // Fetch last message if it exists
      let lastMessage = undefined;
      if (conv.last_message_id) {
        const { data: messageData } = await supabase
          .from('messages')
          .select('id, content, sent_at')
          .eq('id', conv.last_message_id)
          .maybeSingle();
        
        if (messageData) {
          lastMessage = messageData;
        }
      }

      // Provide proper user data with better fallback handling
      const user1 = user1Data ? {
        ...user1Data,
        name: user1Data.name?.trim() || 'Unknown User'
      } : {
        id: conv.user1_id || '',
        name: 'Unknown User',
        profile_image: null,
        role: 'student'
      };

      const user2 = user2Data ? {
        ...user2Data,
        name: user2Data.name?.trim() || 'Unknown User'
      } : {
        id: conv.user2_id || '',
        name: 'Unknown User', 
        profile_image: null,
        role: 'student'
      };

      conversationsWithDetails.push({
        ...conv,
        user1,
        user2,
        last_message: lastMessage
      });
    }

    return { data: conversationsWithDetails, error: null };
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
