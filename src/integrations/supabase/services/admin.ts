import { supabase } from "@/integrations/supabase/client";

// Function to check if a user is an admin
export async function isUserAdmin(userId?: string) {
  try {
    // If no userId is provided, get the current user
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return false;
      }
      
      userId = session.user.id;
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data) {
      console.error("Error fetching user admin status:", error);
      return false;
    }
    
    return data.is_admin === true;
  } catch (error) {
    console.error("Exception in isUserAdmin:", error);
    return false;
  }
}

// Function to set a user as an admin (requires admin privileges)
export async function setUserAsAdmin(userIdToPromote: string) {
  try {
    // Check if current user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can promote other users to admin");
    }
    
    const { data, error } = await supabase
      .from('users')
      .update({ is_admin: true })
      .eq('id', userIdToPromote)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating user admin status:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in setUserAsAdmin:", error);
    throw error;
  }
}

// Function to remove admin privileges from a user (requires admin privileges)
export async function removeAdminPrivilege(userIdToRevoke: string) {
  try {
    // Check if current user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can revoke admin privileges");
    }
    
    const { data, error } = await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('id', userIdToRevoke)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating user admin status:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in removeAdminPrivilege:", error);
    throw error;
  }
}

// Get all users with admin role
export async function getAdminUsers() {
  try {
    // Check if current user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can view all admin users");
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, profile_image')
      .eq('is_admin', true);
    
    if (error) {
      console.error("Error fetching admin users:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in getAdminUsers:", error);
    throw error;
  }
}

// Enhanced user search by email or name
export async function getUserByEmail(query: string) {
  try {
    // Check if current user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can search for users");
    }
    
    console.log("Searching for users with query:", query);
    
    // First try exact email match
    let { data: exactEmailMatch, error: emailError } = await supabase
      .from('users')
      .select('id, name, email, role, profile_image, is_admin, department')
      .eq('email', query.toLowerCase())
      .limit(1);
    
    if (emailError) {
      console.error("Error in exact email search:", emailError);
    }
    
    // If exact email match found, return it
    if (exactEmailMatch && exactEmailMatch.length > 0) {
      console.log("Found exact email match:", exactEmailMatch);
      return exactEmailMatch;
    }
    
    // Otherwise, search by email pattern and name
    const { data: searchResults, error: searchError } = await supabase
      .from('users')
      .select('id, name, email, role, profile_image, is_admin, department')
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(10);
    
    if (searchError) {
      console.error("Error in pattern search:", searchError);
      throw searchError;
    }
    
    console.log("Search results:", searchResults);
    return searchResults || [];
    
  } catch (error) {
    console.error("Exception in getUserByEmail:", error);
    throw error;
  }
}

// Get mentors only (for badge awarding)
export async function getMentorsForBadges() {
  try {
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can view mentors for badge awarding");
    }
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id, 
        name, 
        email, 
        role, 
        profile_image, 
        department,
        is_admin
      `)
      .in('role', ['mentor', 'both'])
      .limit(50);
    
    if (error) {
      console.error("Error fetching mentors:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in getMentorsForBadges:", error);
    throw error;
  }
}
