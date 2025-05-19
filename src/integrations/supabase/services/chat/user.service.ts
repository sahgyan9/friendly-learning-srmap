
import { supabase } from "@/integrations/supabase/client";

// Get user data by ID
export async function getUserById(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, profile_image, role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`Error fetching user ${userId}:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in getUserById:', err);
    return { data: null, error: err as Error };
  }
}
