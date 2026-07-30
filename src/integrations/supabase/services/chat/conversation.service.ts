
import { supabase } from "@/integrations/supabase/client";
import { Conversation, Message } from "@/types/chat";

interface ChatProfile {
  id: string;
  name: string;
  profile_image: string | null;
  role: string;
}

/**
 * A name to show when the profile has none.
 *
 * Never "Unknown User", which described the platform's own failure to read a
 * row rather than anything about the person. Deliberately not derived from the
 * email address either: that leaks part of it to whoever they are chatting with.
 */
function displayName(name: string | null | undefined, role: string | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  return role === "mentor" || role === "both" ? "Mentor" : "Student";
}

/**
 * Display profiles for everyone in the caller's conversations.
 *
 * Goes through chat_participant_profiles rather than selecting from users: RLS
 * on that table allows only auth.uid() = id, which is why every student showed
 * up as "Unknown User" while mentors resolved fine (public.mentors is
 * world-readable). The RPC returns name, image and role for people the caller
 * already shares a conversation with, and nothing else about them.
 *
 * Batched. The previous version issued two queries per participant per
 * conversation, so a list of ten chats cost forty round trips.
 */
async function fetchParticipantProfiles(userIds: string[]): Promise<Map<string, ChatProfile>> {
  const profiles = new Map<string, ChatProfile>();
  if (userIds.length === 0) return profiles;

  const [{ data: users, error }, { data: mentors }] = await Promise.all([
    supabase.rpc("chat_participant_profiles", { p_user_ids: userIds }),
    // Mentors keep a separate, usually better, profile image, and this table is
    // public — so it also covers anyone whose users row is missing entirely.
    supabase.from("mentors").select("id, name, profile_image").in("id", userIds),
  ]);

  if (error) {
    console.error("Error fetching chat participant profiles:", error);
  }

  const mentorById = new Map((mentors ?? []).map((m) => [m.id, m]));

  for (const id of userIds) {
    const user = (users ?? []).find((u) => u.id === id);
    const mentor = mentorById.get(id);

    profiles.set(id, {
      id,
      name: displayName(user?.name ?? mentor?.name, user?.role),
      profile_image: mentor?.profile_image ?? user?.profile_image ?? null,
      role: user?.role ?? (mentor ? "mentor" : "student"),
    });
  }

  return profiles;
}

// Get all conversations for a user with improved data fetching
export async function getUserConversations(userId: string) {
  try {
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
      return { data: [], error: null };
    }

    // A conversation with yourself is a leftover from testing rather than
    // something anyone can create through the UI, and it renders as an empty
    // chat with your own name in the list.
    const conversations = conversationsData.filter((c) => c.user1_id !== c.user2_id);

    const participantIds = [
      ...new Set(conversations.flatMap((c) => [c.user1_id, c.user2_id])),
    ];
    const profiles = await fetchParticipantProfiles(participantIds);

    const lastMessageIds = conversations
      .map((c) => c.last_message_id)
      .filter((id): id is string => Boolean(id));

    // Selects the full row rather than three columns: the preview only needs
    // content, but Conversation.last_message is a Message and the trimmed
    // version silently satisfied it only because the old code left it untyped.
    const messagesById = new Map<string, Message>();
    if (lastMessageIds.length > 0) {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, sent_at, sender_id, receiver_id, is_read, conversation_id')
        .in('id', lastMessageIds);

      for (const message of messages ?? []) {
        messagesById.set(message.id, message);
      }
    }

    const fallback = (id: string): ChatProfile => ({
      id,
      name: "Student",
      profile_image: null,
      role: "student",
    });

    const conversationsWithDetails: Conversation[] = conversations.map((conv) => ({
      ...conv,
      user1: profiles.get(conv.user1_id) ?? fallback(conv.user1_id),
      user2: profiles.get(conv.user2_id) ?? fallback(conv.user2_id),
      last_message: conv.last_message_id ? messagesById.get(conv.last_message_id) : undefined,
    }));

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
