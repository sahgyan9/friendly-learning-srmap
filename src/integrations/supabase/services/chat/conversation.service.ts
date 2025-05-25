
import { supabase } from "@/integrations/supabase/client";
import { Conversation } from "@/types/chat";

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

    // Check if any user data is missing and fetch it separately
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
                  console.log(`Updated user1 data for conversation ${conv.id}`);
                }
                if (conv.user2_id === user.id && (!conv.user2 || !conv.user2.name)) {
                  conv.user2 = user;
                  console.log(`Updated user2 data for conversation ${conv.id}`);
                }
              });
            });
          }
        }
      }

      // Final validation and fallback for any remaining missing data
      conversationsData.forEach(conv => {
        if (!conv.user1 || !conv.user1.name) {
          console.error(`Still missing user1 data for conversation ${conv.id}, creating fallback`);
          conv.user1 = {
            id: conv.user1_id || '',
            name: 'User',
            profile_image: null,
            role: 'user'
          };
        }
        if (!conv.user2 || !conv.user2.name) {
          console.error(`Still missing user2 data for conversation ${conv.id}, creating fallback`);
          conv.user2 = {
            id: conv.user2_id || '',
            name: 'User',
            profile_image: null,
            role: 'user'
          };
        }
      });
    }

    // Fetch the last message separately for each conversation
    const enhancedConversations: Conversation[] = [];

    for (const conversation of conversationsData || []) {
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
