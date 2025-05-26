
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

    if (!conversationsData || conversationsData.length === 0) {
      console.log("No conversations found");
      return { data: [], error: null };
    }

    // Get all unique user IDs to fetch in bulk
    const allUserIds = new Set<string>();
    conversationsData.forEach(conv => {
      if (conv.user1_id) allUserIds.add(conv.user1_id);
      if (conv.user2_id) allUserIds.add(conv.user2_id);
    });

    console.log("Fetching user data for IDs:", Array.from(allUserIds));

    // Fetch all user data in a single query
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .in('id', Array.from(allUserIds));

    if (usersError) {
      console.error('Error fetching users data:', usersError);
    }

    console.log("Fetched users data:", usersData);

    // Create a map for quick user lookup
    const usersMap = new Map();
    if (usersData) {
      usersData.forEach(user => {
        usersMap.set(user.id, user);
      });
    }

    console.log("Users map created with keys:", Array.from(usersMap.keys()));

    // Now enhance conversations with user data and last messages
    const enhancedConversations = await Promise.all(
      conversationsData.map(async (conv) => {
        // Get user data from the map with fallbacks
        const user1Data = usersMap.get(conv.user1_id);
        const user2Data = usersMap.get(conv.user2_id);

        console.log(`Conversation ${conv.id}:`);
        console.log(`  - user1_id: ${conv.user1_id}, found data:`, user1Data);
        console.log(`  - user2_id: ${conv.user2_id}, found data:`, user2Data);

        const user1 = user1Data && user1Data.name ? user1Data : {
          id: conv.user1_id || '',
          name: 'Unknown User',
          profile_image: null,
          role: 'user'
        };

        const user2 = user2Data && user2Data.name ? user2Data : {
          id: conv.user2_id || '',
          name: 'Unknown User',
          profile_image: null,
          role: 'user'
        };

        // Fetch the last message if it exists
        let lastMessage = undefined;
        if (conv.last_message_id) {
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('*')
            .eq('id', conv.last_message_id)
            .maybeSingle();

          if (messageError) {
            console.error(`Error fetching last message for conversation ${conv.id}:`, messageError);
          } else {
            lastMessage = messageData;
          }
        }

        console.log(`Final conversation ${conv.id} - user1: ${user1.name}, user2: ${user2.name}`);

        return {
          ...conv,
          user1,
          user2,
          last_message: lastMessage
        };
      })
    );

    console.log("Enhanced conversations:", enhancedConversations.map(c => ({
      id: c.id,
      user1_name: c.user1?.name,
      user2_name: c.user2?.name
    })));

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
