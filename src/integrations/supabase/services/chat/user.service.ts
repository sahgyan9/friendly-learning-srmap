
import { supabase } from "@/integrations/supabase/client";

// Get user data by ID with improved error handling and fallbacks
export async function getUserById(userId: string) {
  try {

    if (!userId || typeof userId !== 'string') {
      console.error(`Invalid user ID provided: ${userId}`);
      return { 
        data: null, 
        error: new Error('Invalid user ID provided') 
      };
    }

    // Get user data from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, profile_image, role, email')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error(`Error fetching user ${userId}:`, userError);
      return { data: null, error: userError };
    }

    if (!userData) {
      console.warn(`No user found with ID ${userId}`);
      return { 
        data: null, 
        error: new Error(`User not found with ID: ${userId}`) 
      };
    }

    // Check for mentor data as well for profile image fallback
    const { data: mentorData } = await supabase
      .from('mentors')
      .select('id, name, profile_image')
      .eq('id', userId)
      .maybeSingle();

    // Prepare final user data with proper fallbacks
    let finalName = userData.name;
    
    // If name is missing or empty, try fallbacks
    if (!finalName || !finalName.trim()) {
      if (mentorData?.name && mentorData.name.trim()) {
        finalName = mentorData.name.trim();
      } else if (userData.email) {
        // Extract name from email as fallback
        const emailPrefix = userData.email.split('@')[0];
        finalName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
      } else {
        finalName = 'User';
      }
    }

    const processedUserData = {
      id: userData.id,
      name: finalName,
      profile_image: mentorData?.profile_image || userData.profile_image || null,
      role: userData.role
    };

    return { data: processedUserData, error: null };

  } catch (err) {
    console.error('Exception in getUserById:', err);
    return { data: null, error: err as Error };
  }
}

// Validate and ensure user has proper name data
export async function validateUserData(userId: string) {
  try {
    const { data: userData, error } = await getUserById(userId);
    
    if (error || !userData) {
      return { isValid: false, error };
    }

    // Check if user has a proper name
    const hasValidName = userData.name && 
                        userData.name.trim() !== '' && 
                        userData.name !== 'Unknown User' && 
                        userData.name !== 'User';

    return {
      isValid: hasValidName,
      userData,
      error: null
    };
  } catch (err) {
    console.error('Exception in validateUserData:', err);
    return { 
      isValid: false, 
      error: err as Error 
    };
  }
}

export interface CampusUserResult {
  id: string;
  name: string;
  profile_image: string | null;
  role?: string;
  department?: string;
  badge?: string;
}

/**
 * Searches mentors and campus profiles by name/department to start new direct messages.
 */
export async function searchCampusUsers(query: string, currentUserId?: string): Promise<CampusUserResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { data: mentors, error } = await supabase
      .from("mentors")
      .select("id, name, profile_image, department")
      .ilike("name", `%${trimmed}%`)
      .limit(10);

    if (error) {
      console.error("Error searching mentors:", error);
      return [];
    }

    const results: CampusUserResult[] = (mentors ?? [])
      .filter((m) => !currentUserId || m.id !== currentUserId)
      .map((m) => ({
        id: m.id,
        name: m.name?.trim() || "Mentor",
        profile_image: m.profile_image || null,
        role: "mentor",
        department: m.department || undefined,
        badge: "Mentor",
      }));

    return results;
  } catch (err) {
    console.error("Exception in searchCampusUsers:", err);
    return [];
  }
}

