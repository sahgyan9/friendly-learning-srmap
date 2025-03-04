
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  sent_at: string;
  is_read: boolean;
  conversation_id: string;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message: string;
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
}
