
import { supabase } from "../client";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  responded_at: string | null;
  created_at: string;
}

export const contactService = {
  // Submit a new contact message
  async submitMessage(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }) {
    const { error } = await supabase
      .from('contact_messages')
      .insert([data]);

    if (error) throw error;
  },

  // Get all contact messages (admin only)
  async getMessages() {
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ContactMessage[];
  },

  // Update message status
  async updateMessageStatus(messageId: string, status: string) {
    const { error } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', messageId);

    if (error) throw error;
  },

  // Add admin response to message
  async respondToMessage(messageId: string, response: string) {
    const { error } = await supabase
      .from('contact_messages')
      .update({
        admin_response: response,
        responded_at: new Date().toISOString(),
        status: 'responded'
      })
      .eq('id', messageId);

    if (error) throw error;
  }
};
