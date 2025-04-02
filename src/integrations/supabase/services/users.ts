
import { supabase } from '../client';
import type { Database } from '../types';

type UserProfile = Database['public']['Tables']['users']['Row'];

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
    bio?: string;
  }
) => {
  try {
    console.log("Upserting user profile:", id, profileData);
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
    console.log("Getting user profile for:", userId);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned" error
    console.log("User profile result:", data || "Not found");
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return { data: null, error };
  }
};

/**
 * Update a user's profile
 */
export const updateUserProfile = async (userId: string, updates: Partial<UserProfile>) => {
  try {
    console.log("Updating user profile:", userId, updates);
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
