
import { supabase } from '../client';
import { Mentor } from '@/types/mentor';
import type { Database } from '../types';

type UserRecord = Database['public']['Tables']['users']['Row'];
type MentorRequest = Database['public']['Tables']['mentor_requests']['Row'];

/**
 * Get all mentors
 */
export const getMentors = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_mentor', true);

    if (error) throw error;

    // Map to our Mentor type
    const mentors = data.map(user => ({
      id: user.id,
      name: user.name,
      department: user.department || '',
      skills: user.skills || [],
      rating: 4.5, // Default rating until we implement the actual rating system
      profile_image: user.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366F1&color=fff`,
      linkedin_url: user.linkedin_url,
      bio: user.bio || '',
      review_count: 0 // Default until we implement the actual review system
    }));

    return { data: mentors, error: null };
  } catch (error) {
    console.error("Error fetching mentors:", error);
    return { data: null, error };
  }
};

/**
 * Get a mentor by ID
 */
export const getMentorById = async (mentorId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', mentorId)
      .eq('is_mentor', true)
      .single();

    if (error) throw error;

    // Map to our Mentor type
    const mentor: Mentor = {
      id: data.id,
      name: data.name,
      department: data.department || '',
      skills: data.skills || [],
      rating: 4.5, // Default rating until we implement the actual rating system
      profile_image: data.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=6366F1&color=fff`,
      linkedin_url: data.linkedin_url,
      bio: data.bio || '',
      review_count: 0 // Default until we implement the actual review system
    };

    return { data: mentor, error: null };
  } catch (error) {
    console.error("Error fetching mentor:", error);
    return { data: null, error };
  }
};

/**
 * Submit a mentor application
 */
export const submitMentorRequest = async (userId: string, idCardUrl: string) => {
  try {
    const { data, error } = await supabase
      .from('mentor_requests')
      .insert({
        user_id: userId,
        id_card_url: idCardUrl,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error submitting mentor request:", error);
    return { data: null, error };
  }
};

/**
 * Add a new mentor
 */
export const addMentor = async (mentorData: Mentor) => {
  try {
    // First, update the user to set is_mentor to true
    const { error: userError } = await supabase
      .from('users')
      .update({ 
        is_mentor: true,
        department: mentorData.department,
        skills: mentorData.skills,
        linkedin_url: mentorData.linkedin_url,
        profile_pic_url: mentorData.profile_image
      })
      .eq('id', mentorData.id);

    if (userError) throw userError;

    return { data: mentorData, error: null };
  } catch (error) {
    console.error("Error adding mentor:", error);
    return { data: null, error };
  }
};
