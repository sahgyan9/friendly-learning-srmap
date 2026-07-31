
import { supabase } from '../client';

// Helper function to get typed data from Supabase tables
export async function getMentors() {
  const { data, error } = await supabase
    .from('mentors')
    .select('*, users(profile_image)')
    .neq('department', 'General')
    .not('department', 'is', null)
    .order('rating', { ascending: false });

  if (data) {
    const formattedData = data.map((mentor: any) => ({
      ...mentor,
      profile_image: mentor.profile_image || mentor.users?.profile_image || "",
    }));
    return { data: formattedData, error: null };
  }

  return { data, error };
}

export async function addMentor(mentor: {
  name: string;
  department: string;
  skills: string[];
  rating: number;
  profile_image: string;
  linkedin_url?: string;
  bio?: string;
  review_count?: number;
}) {
  return supabase
    .from('mentors')
    .insert([mentor]);
}

export async function searchMentors(query: string) {
  // If empty query, just return all mentors (excluding General)
  if (!query || !query.trim()) {
    return getMentors();
  }

  const lowerQuery = query.toLowerCase().trim();

  try {
    // Search in name, department, and bio with proper formatting, excluding General department
    const { data, error } = await supabase
      .from('mentors')
      .select('*, users(profile_image)')
      .neq('department', 'General')
      .not('department', 'is', null)
      .or(`name.ilike.%${lowerQuery}%,department.ilike.%${lowerQuery}%,bio.ilike.%${lowerQuery}%`)
      .order('rating', { ascending: false });

    if (error) {
      throw error;
    }

    const formattedData = (data || []).map((mentor: any) => ({
      ...mentor,
      profile_image: mentor.profile_image || mentor.users?.profile_image || "",
    }));

    // For skills array, we need to filter in JS since it's complex in SQL
    const mentorsWithMatchingSkills = formattedData.filter(mentor =>
      mentor.skills && mentor.skills.some(skill =>
        skill.toLowerCase().includes(lowerQuery)
      )
    );

    // Merge SQL results with JS filtered results for skills
    const mergedResults = [...formattedData, ...mentorsWithMatchingSkills];

    // Remove duplicates based on id
    const uniqueResults = Array.from(
      new Map(mergedResults.map(item => [item.id, item])).values()
    );

    return { data: uniqueResults, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// Get a single mentor by ID
export async function getMentorById(id: string) {
  const { data, error } = await supabase
    .from('mentors')
    .select('*, users(profile_image)')
    .eq('id', id)
    .single();

  if (data) {
    const formatted = {
      ...data,
      profile_image: data.profile_image || (data as any).users?.profile_image || "",
    };
    return { data: formatted, error: null };
  }

  return { data, error };
}
