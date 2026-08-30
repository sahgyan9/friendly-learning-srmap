
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
    if (!userId || !userId.trim()) {
      return { error: null };
    }

    const { error } = await supabase.rpc('update_user_presence', {
      p_user_id: userId,
      p_is_online: isOnline
    });

    if (error) {
      // When a user logs out or has an expired session, the RPC fails with permission denied (42501).
      // Suppress noisy logs for this expected unauthenticated/signout transition state.
      const isAuthIssue = error.code === '42501' || error.message?.includes('permission denied') || error.code === 'PGRST301';
      if (!isAuthIssue) {
        console.error(
          'Error updating user presence:',
          error.message,
          error.code ? `(code: ${error.code})` : ''
        );
      }
      return { error };
    }

    return { error: null };
  } catch (err) {
    // Navigating away (e.g. leaving /messages) or signout cancels in-flight requests.
    // In Safari/WebKit, fetch rejections report as "TypeError: Load failed".
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    const isLoadFailed =
      err instanceof TypeError &&
      (err.message.includes('Load failed') ||
       err.message.includes('Failed to fetch') ||
       err.message.includes('NetworkError'));
    if (!isAbort && !isLoadFailed) {
      console.error(
        'Exception updating user presence:',
        err instanceof Error ? err.message : err
      );
    }
    return { error: err as Error };
  }
}

// Mark messages as delivered for a specific conversation
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

// Mark all pending incoming messages as delivered for current user
export async function markAllMessagesDelivered() {
  try {
    const { error } = await (supabase.rpc as any)('mark_all_messages_delivered');

    if (error) {
      console.error('Error marking all messages as delivered:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('Exception marking all messages as delivered:', err);
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
