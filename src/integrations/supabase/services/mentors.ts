
import { supabase } from '../client';

// Helper function to get typed data from Supabase tables
export async function getMentors() {
  const { data, error } = await supabase
    .from('mentors')
    .select('*')
    .neq('department', 'General')
    .order('rating', { ascending: false });
  
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
    console.log("Searching for:", lowerQuery);
    
    // Search in name, department, and bio with proper formatting, excluding General department
    const { data, error } = await supabase
      .from('mentors')
      .select('*')
      .neq('department', 'General')
      .or(`name.ilike.%${lowerQuery}%,department.ilike.%${lowerQuery}%,bio.ilike.%${lowerQuery}%`)
      .order('rating', { ascending: false });
    
    if (error) {
      console.error("Supabase search error:", error);
      throw error;
    }
    
    console.log("SQL search results:", data?.length || 0, "mentors found");
    
    // For skills array, we need to filter in JS since it's complex in SQL
    const mentorsWithMatchingSkills = data?.filter(mentor => 
      mentor.skills.some(skill => 
        skill.toLowerCase().includes(lowerQuery)
      )
    ) || [];
    
    console.log("Skills search results:", mentorsWithMatchingSkills.length, "mentors found");
    
    // Merge SQL results with JS filtered results for skills
    const mergedResults = [...(data || []), ...mentorsWithMatchingSkills];
    
    // Remove duplicates based on id
    const uniqueResults = Array.from(
      new Map(mergedResults.map(item => [item.id, item])).values()
    );
    
    console.log("Final search results:", uniqueResults.length, "unique mentors");
    
    return { data: uniqueResults, error: null };
  } catch (err) {
    console.error("Search error:", err);
    return { data: null, error: err };
  }
}

// Get a single mentor by ID
export async function getMentorById(id: string) {
  const { data, error } = await supabase
    .from('mentors')
    .select('*')
    .eq('id', id)
    .single();
  
  return { data, error };
}
