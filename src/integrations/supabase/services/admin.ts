
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
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    
    if (error || !data) {
      console.error("Error fetching user role:", error);
      return false;
    }
    
    return data.role === 'admin';
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
      .update({ role: 'admin' })
      .eq('id', userIdToPromote)
      .select()
      .single();
    
    if (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in setUserAsAdmin:", error);
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
      .eq('role', 'admin');
    
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

// Get users by email (for admin promotion)
export async function getUserByEmail(email: string) {
  try {
    // Check if current user is admin
    const isAdmin = await isUserAdmin();
    
    if (!isAdmin) {
      throw new Error("Only admins can search for users");
    }
    
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, profile_image')
      .ilike('email', `%${email}%`)
      .limit(10);
    
    if (error) {
      console.error("Error searching users:", error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error("Exception in getUserByEmail:", error);
    throw error;
  }
}
