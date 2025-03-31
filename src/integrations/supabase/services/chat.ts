
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
