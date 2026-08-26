
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  sent_at: string;
  is_read: boolean;
  conversation_id: string;
  delivery_status?: 'sent' | 'delivered' | 'read';
  sender?: {
    id: string;
    name: string;
    profile_image: string;
  };
  reply_to_id?: string | null;
  reply_to?: {
    id: string;
    sender_name: string;
    content: string;
  } | null;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_id: string;
  last_updated: string;
  user1?: {
    id: string;
    name: string;
    profile_image: string;
  };
  user2?: {
    id: string;
    name: string;
    profile_image: string;
  };
  last_message?: Message;
}

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}

export interface UserPresence {
  id: string;
  user_id: string;
  is_online: boolean;
  last_seen: string;
  updated_at: string;
}
