
import { supabase } from '../client';

/**
 * Create or update a user profile
 */
export const upsertUserProfile = async (
  id: string, 
  profileData: { 
    name: string;
    email: string;
    department?: string;
    skills?: string[];
    linkedin_url?: string;
    profile_pic_url?: string;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id,
        ...profileData
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error upserting user profile:", error);
    return { data: null, error };
  }
};

/**
 * Get a user's profile
 */
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { data: null, error };
  }
};

/**
 * Update a user's profile
 */
export const updateUserProfile = async (userId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error updating user profile:", error);
    return { data: null, error };
  }
};
