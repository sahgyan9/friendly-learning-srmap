
import { supabase } from "@/integrations/supabase/client";

export interface EmailSettings {
  email_notifications: boolean;
  email_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export const getUserEmailSettings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email_notifications, email_frequency')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      data: {
        email_notifications: data?.email_notifications ?? true,
        email_frequency: (data?.email_frequency as EmailSettings['email_frequency']) ?? 'immediate'
      },
      error: null
    };
  } catch (error) {
    console.error('Error fetching email settings:', error);
    return { data: null, error };
  }
};

export const updateUserEmailSettings = async (userId: string, settings: Partial<EmailSettings>) => {
  try {
    const { error } = await supabase
      .from('users')
      .update(settings)
      .eq('id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error updating email settings:', error);
    return { error };
  }
};
