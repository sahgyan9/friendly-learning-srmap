
import { supabase } from "@/integrations/supabase/client";

// Update typing indicator
export async function updateTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean
) {
  try {
    const { error } = await supabase.rpc('update_typing_indicator', {
      p_conversation_id: conversationId,
      p_user_id: userId,
      p_is_typing: isTyping
    });

    if (error) {
      console.error('Error updating typing indicator:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Exception updating typing indicator:', err);
    return { error: err as Error };
  }
}

// Update user presence
export async function updateUserPresence(userId: string, isOnline: boolean) {
  try {
    const { error } = await supabase.rpc('update_user_presence', {
      p_user_id: userId,
      p_is_online: isOnline
    });

    if (error) {
      console.error('Error updating user presence:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Exception updating user presence:', err);
    return { error: err as Error };
  }
}

// Mark messages as delivered
export async function markMessagesDelivered(conversationId: string, userId: string) {
  try {
    const { error } = await supabase.rpc('mark_messages_delivered', {
      p_conversation_id: conversationId,
      p_user_id: userId
    });

    if (error) {
      console.error('Error marking messages as delivered:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Exception marking messages as delivered:', err);
    return { error: err as Error };
  }
}

// Get typing indicators for a conversation
export async function getTypingIndicators(conversationId: string) {
  try {
    const { data, error } = await supabase
      .from('typing_indicators')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('is_typing', true);

    if (error) {
      console.error('Error fetching typing indicators:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching typing indicators:', err);
    return { data: null, error: err as Error };
  }
}

// Get user presence
export async function getUserPresence(userIds: string[]) {
  try {
    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .in('user_id', userIds);

    if (error) {
      console.error('Error fetching user presence:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching user presence:', err);
    return { data: null, error: err as Error };
  }
}
