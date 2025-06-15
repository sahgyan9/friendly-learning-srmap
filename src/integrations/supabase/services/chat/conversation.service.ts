
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/chat";

// Get all conversations for a user with improved data fetching
export async function getUserConversations(userId: string) {
  try {
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
      console.log(`Processing conversation ${conv.id} between ${conv.user1_id} and ${conv.user2_id}`);

      // Fetch user data for both participants
      const [user1Result, user2Result] = await Promise.all([
        fetchUserData(conv.user1_id),
        fetchUserData(conv.user2_id)
      ]);

      console.log('User1 data:', user1Result);
      console.log('User2 data:', user2Result);

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

      conversationsWithDetails.push({
        ...conv,
        user1: user1Result,
        user2: user2Result,
        last_message: lastMessage
      });
    }

    console.log('Final conversations with details:', conversationsWithDetails);
    return { data: conversationsWithDetails, error: null };
  } catch (err) {
    console.error('Exception in getUserConversations:', err);
    return { data: null, error: err as Error };
  }
}

// Enhanced function to fetch complete user data prioritizing mentor data
async function fetchUserData(userId: string) {
  try {
    console.log(`Fetching complete data for user ${userId}`);

    // First, get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error(`Error fetching user data for ${userId}:`, userError);
    }

    console.log(`User data for ${userId}:`, userData);

    // Then, check if this user is also a mentor
    const { data: mentorData, error: mentorError } = await supabase
      .from('mentors')
      .select('id, name, profile_image')
      .eq('id', userId)
      .maybeSingle();

    if (mentorError) {
      console.log(`No mentor data found for ${userId} (this is normal if user is not a mentor)`);
    }

    console.log(`Mentor data for ${userId}:`, mentorData);

    // Prioritize mentor data over user data, with proper fallbacks
    const finalUserData = {
      id: userId,
      name: (mentorData?.name?.trim() || userData?.name?.trim() || 'Unknown User'),
      profile_image: mentorData?.profile_image || userData?.profile_image || null,
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
