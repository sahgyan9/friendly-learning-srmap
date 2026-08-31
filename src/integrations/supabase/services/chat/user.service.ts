
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

// Escapes ILIKE wildcard metacharacters so a literal '%' or '_' typed by the
// searcher matches itself instead of acting as a pattern wildcard. Mirrors the
// escaping applied server-side in the search_campus_users RPC (Postgres
// ILIKE's default escape character is backslash) — needed here too because
// the fallback below builds its own ILIKE pattern client-side.
function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
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
 * Searches students, mentors, and peers across SRM AP to start new direct messages.
 * Uses the secure search_campus_users RPC which safely respects RLS and excludes
 * private contact data (email, mobile, etc.).
 */
export async function searchCampusUsers(query: string, currentUserId?: string): Promise<CampusUserResult[]> {
  const trimmed = query.trim();

  try {
    // Invoke the secure search_campus_users RPC
    const { data: rpcUsers, error: rpcError } = await (supabase.rpc as any)("search_campus_users", {
      p_query: trimmed,
      p_limit: 25,
    });

    if (!rpcError && Array.isArray(rpcUsers)) {
      return (rpcUsers as CampusUserResult[]).filter(
        (u) => !currentUserId || u.id !== currentUserId
      );
    }

    if (rpcError) {
      console.warn("search_campus_users RPC warning, falling back to mentors:", rpcError);
    }

    // Fallback: query mentors table directly if the RPC is unavailable (e.g.
    // the migration hasn't reached production yet). Runs for both empty and
    // non-empty queries so the default "recommended mentors" view degrades
    // gracefully too, not just active searches.
    let mentorsQuery = supabase
      .from("mentors")
      .select("id, name, profile_image, department, is_alumni")
      .limit(15);

    if (trimmed) {
      mentorsQuery = mentorsQuery.ilike("name", `%${escapeIlikePattern(trimmed)}%`);
    }

    const { data: mentors, error: mentorError } = await mentorsQuery;

    if (mentorError) {
      console.error("Error searching mentors in fallback:", mentorError);
      return [];
    }

    return (mentors ?? [])
      .filter((m) => !currentUserId || m.id !== currentUserId)
      .map((m) => ({
        id: m.id,
        name: m.name?.trim() || "Mentor",
        profile_image: m.profile_image || null,
        role: "mentor",
        department: m.department || undefined,
        badge: m.is_alumni ? "Alumni" : "Mentor",
      }));
  } catch (err) {
    console.error("Exception in searchCampusUsers:", err);
    return [];
  }
}

