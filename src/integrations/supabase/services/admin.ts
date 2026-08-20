
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
    const { data, error } = await supabase.rpc('set_user_admin_status' as any, {
      p_target_user_id: userIdToPromote,
      p_is_admin: true,
    });
    
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
    const { data, error } = await supabase.rpc('set_user_admin_status' as any, {
      p_target_user_id: userIdToRevoke,
      p_is_admin: false,
    });
    
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

// Get admin audit logs with manual joins to handle missing foreign keys
export async function getAdminAuditLogs(limit: number = 50) {
  try {
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can view audit logs");
    }
    
    // First get the audit logs
    const { data: auditLogs, error: auditError } = await supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (auditError) {
      console.error("Error fetching audit logs:", auditError);
      throw auditError;
    }

    if (!auditLogs || auditLogs.length === 0) {
      return [];
    }

    // Get all unique user IDs from the audit logs
    const adminUserIds = [...new Set(auditLogs.map(log => log.admin_user_id).filter(Boolean))];
    const targetUserIds = [...new Set(auditLogs.map(log => log.target_user_id).filter(Boolean))];
    const allUserIds = [...new Set([...adminUserIds, ...targetUserIds])];

    // Fetch user data for all referenced users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', allUserIds);

    if (usersError) {
      console.error("Error fetching users for audit logs:", usersError);
    }

    // Create a map of user ID to user data for quick lookup
    const userMap = new Map();
    if (users) {
      users.forEach(user => {
        userMap.set(user.id, user);
      });
    }

    // Combine audit logs with user data
    const enrichedLogs = auditLogs.map(log => ({
      ...log,
      admin_user: log.admin_user_id ? userMap.get(log.admin_user_id) || null : null,
      target_user: log.target_user_id ? userMap.get(log.target_user_id) || null : null
    }));
    
    return enrichedLogs;
  } catch (error) {
    console.error("Exception in getAdminAuditLogs:", error);
    throw error;
  }
}
