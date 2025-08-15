import { supabase } from "@/integrations/supabase/client";
import { InputSanitizer } from "@/utils/input-sanitization";

// Function to check if a user is an admin using the secure database function
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
    
    // Use the secure database function instead of direct query
    const { data, error } = await supabase.rpc('is_admin_user', {
      user_id: userId
    });
    
    if (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
    
    return data === true;
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
    
    // Log the admin action before making changes
    await logAdminAction('promote_user_to_admin', userIdToPromote, {
      action: 'User promoted to admin status',
      target_user_id: userIdToPromote
    });
    
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
    
    // Log the admin action before making changes
    await logAdminAction('revoke_admin_privileges', userIdToRevoke, {
      action: 'Admin privileges revoked from user',
      target_user_id: userIdToRevoke
    });
    
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

// Enhanced user search by email or name with improved security
export async function getUserByEmail(query: string) {
  try {
    // Check if current user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can search for users");
    }
    
    // Enhanced input validation and sanitization
    const sanitizedQuery = InputSanitizer.sanitizeSearchQuery(query);
    if (!sanitizedQuery || sanitizedQuery.length < 2) {
      throw new Error("Query must be at least 2 characters long");
    }
    
    // Check rate limiting
    const userKey = `search_${(await supabase.auth.getUser()).data.user?.id}`;
    if (!InputSanitizer.checkRateLimit(userKey, 20, 60000)) {
      throw new Error("Too many search requests. Please wait before trying again.");
    }
    
    console.log("Searching for users with query:", sanitizedQuery);
    
    // First try exact email match
    let { data: exactEmailMatch, error: emailError } = await supabase
      .from('users')
      .select('id, name, email, role, profile_image, is_admin, department')
      .eq('email', sanitizedQuery.toLowerCase())
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
      .or(`email.ilike.%${sanitizedQuery}%,name.ilike.%${sanitizedQuery}%`)
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

// Log admin actions using the secure database function
async function logAdminAction(actionType: string, targetUserId?: string, actionDetails?: any) {
  try {
    const { error } = await supabase.rpc('log_admin_action', {
      action_type: actionType,
      target_id: targetUserId || null,
      action_details: actionDetails || null
    });
    
    if (error) {
      console.error("Error logging admin action:", error);
    }
  } catch (error) {
    console.error("Exception logging admin action:", error);
  }
}

// Get admin audit logs (enhanced with better error handling)
export async function getAdminAuditLogs(limit: number = 50) {
  try {
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can view audit logs");
    }
    
    const { data, error } = await supabase
      .from('admin_audit_log')
      .select(`
        *,
        admin_user:users!admin_user_id(name, email),
        target_user:users!target_user_id(name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error("Error fetching audit logs:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in getAdminAuditLogs:", error);
    throw error;
  }
}
