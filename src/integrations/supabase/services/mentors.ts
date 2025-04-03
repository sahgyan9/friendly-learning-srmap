
import { supabase } from '../client';

// Helper function to get typed data from Supabase tables
export async function getMentors() {
  const { data, error } = await supabase
    .from('mentors')
    .select('*');
  
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
  if (!query.trim()) {
    return getMentors();
  }
  
  const lowerQuery = query.toLowerCase();
  
  // Search in name, department, skills, and bio
  const { data, error } = await supabase
    .from('mentors')
    .select('*')
    .or(`
      name.ilike.%${lowerQuery}%,
      department.ilike.%${lowerQuery}%,
      bio.ilike.%${lowerQuery}%
    `)
    .order('rating', { ascending: false });
    
  // For skills array, we need to filter in JS since it's complex in SQL
  const filteredData = data?.filter(mentor => 
    mentor.skills.some(skill => 
      skill.toLowerCase().includes(lowerQuery)
    )
  ) || [];
  
  // Merge SQL results with JS filtered results for skills
  const mergedResults = [...(data || []), ...filteredData];
  
  // Remove duplicates based on id
  const uniqueResults = Array.from(
    new Map(mergedResults.map(item => [item.id, item])).values()
  );
  
  return { data: uniqueResults, error };
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
