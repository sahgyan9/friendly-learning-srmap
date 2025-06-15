
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/chat";

// Get all conversations for a user with improved data fetching
export async function getUserConversations(userId: string) {
  try {
    console.log('=== getUserConversations Debug ===');
    console.log('Fetching conversations for user:', userId);

    // Fetch conversations without complex joins
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_updated', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return { data: null, error: conversationsError };
    }

    if (!conversationsData || conversationsData.length === 0) {
      console.log('No conversations found');
      return { data: [], error: null };
    }

    console.log('Raw conversations data:', conversationsData);

    // Process each conversation to get complete user data
    const conversationsWithDetails: Conversation[] = [];
    
    for (const conv of conversationsData) {
      console.log(`\n--- Processing conversation ${conv.id} ---`);
      console.log(`Between users: ${conv.user1_id} and ${conv.user2_id}`);

      // Fetch user data for both participants
      const [user1Result, user2Result] = await Promise.all([
        fetchUserData(conv.user1_id),
        fetchUserData(conv.user2_id)
      ]);

      console.log('User1 result:', user1Result);
      console.log('User2 result:', user2Result);

      // Fetch last message if exists
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

      const conversationWithDetails = {
        ...conv,
        user1: user1Result,
        user2: user2Result,
        last_message: lastMessage
      };

      console.log('Final conversation object:', conversationWithDetails);
      conversationsWithDetails.push(conversationWithDetails);
    }

    console.log('=== Final conversations array ===');
    console.log(conversationsWithDetails);
    return { data: conversationsWithDetails, error: null };
  } catch (err) {
    console.error('Exception in getUserConversations:', err);
    return { data: null, error: err as Error };
  }
}

// Improved function to fetch user data - always prioritizes users table
async function fetchUserData(userId: string) {
  try {
    console.log(`\n>> Fetching user data for ${userId}`);

    // Always fetch from users table first - this is the primary source of truth
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error(`Error fetching user data for ${userId}:`, userError);
    }

    console.log(`Raw user data for ${userId}:`, userData);

    // Create final user data with proper fallbacks and validation
    const finalUserData = {
      id: userId,
      name: userData?.name && userData.name.trim() !== "" ? userData.name.trim() : 'Unknown User',
      profile_image: userData?.profile_image || null,
      role: userData?.role || 'student'
    };

    console.log(`Final processed data for ${userId}:`, finalUserData);
    return finalUserData;

  } catch (err) {
    console.error(`Exception fetching user data for ${userId}:`, err);
    return {
      id: userId,
      name: 'Unknown User',
      profile_image: null,
      role: 'student'
    };
  }
}

// Get or create a conversation between two users - improved with better state management
export async function getOrCreateConversation(user1Id: string, user2Id: string) {
  try {
    console.log(`Getting/creating conversation between ${user1Id} and ${user2Id}`);

    // First check if conversation exists using RPC
    const { data: existingConversations, error: fetchError } = await supabase.rpc('get_conversation', {
      user1: user1Id,
      user2: user2Id
    });

    if (fetchError) {
      console.error('Error checking for existing conversation:', fetchError);
      return { data: null, error: fetchError };
    }

    // If conversation exists, return it with user data
    if (existingConversations && existingConversations.length > 0) {
      const conversation = existingConversations[0];
      console.log('Found existing conversation:', conversation.id);
      
      // Fetch user data for the existing conversation
      const [user1Data, user2Data] = await Promise.all([
        fetchUserData(conversation.user1_id),
        fetchUserData(conversation.user2_id)
      ]);

      return { 
        data: {
          ...conversation,
          user1: user1Data,
          user2: user2Data
        }, 
        error: null 
      };
    }

    // If no conversation exists, create a new one using RPC
    console.log('Creating new conversation');
    const { data: newConversation, error: createError } = await supabase.rpc('create_conversation', {
      user1_id: user1Id,
      user2_id: user2Id
    });

    if (createError) {
      console.error('Error creating conversation:', createError);
      return { data: null, error: createError };
    }

    // Fetch user data for the new conversation
    const [user1Data, user2Data] = await Promise.all([
      fetchUserData(user1Id),
      fetchUserData(user2Id)
    ]);

    const conversationWithUserData = {
      ...newConversation,
      user1: user1Data,
      user2: user2Data
    };

    console.log('Created new conversation with user data:', conversationWithUserData);
    return { data: conversationWithUserData, error: null };
  } catch (err) {
    console.error('Exception in getOrCreateConversation:', err);
    return { data: null, error: err as Error };
  }
}
