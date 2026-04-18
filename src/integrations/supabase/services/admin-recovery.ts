
import { supabase } from "@/integrations/supabase/client";
import { isUserAdmin } from "./admin";

export interface AdminRecoveryCode {
  id: string;
  recovery_code: string;
  created_by: string;
  used_by?: string;
  used_at?: string;
  expires_at: string;
  created_at: string;
}

// Generate a cryptographically secure recovery code
function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint32Array(16);
  crypto.getRandomValues(array);
  const result = Array.from(array)
    .map((n) => chars[n % chars.length])
    .join('');
  return result.match(/.{1,4}/g)?.join('-') || result;
}

// Create a new admin recovery code
export async function createAdminRecoveryCode() {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      throw new Error("Only admins can create recovery codes");
    }

    const recoveryCode = generateRecoveryCode();
    
    const { data, error } = await supabase
      .from('admin_recovery')
      .insert({
        recovery_code: recoveryCode,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating recovery code:", error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in createAdminRecoveryCode:", error);
    throw error;
  }
}

// Get all recovery codes created by current admin
export async function getMyRecoveryCodes() {
  try {
    const isAdmin = await isUserAdmin();
    if (!isAdmin) {
      throw new Error("Only admins can view recovery codes");
    }

    const { data, error } = await supabase
      .from('admin_recovery')
      .select(`
        *,
        used_by_user:users!admin_recovery_used_by_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching recovery codes:", error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception in getMyRecoveryCodes:", error);
    throw error;
  }
}

// Promote user to admin using recovery code
export async function promoteUserToAdmin(recoveryCode: string, targetUserId: string) {
  try {
    const { data: success, error } = await supabase.rpc('promote_to_admin_with_code', {
      recovery_code: recoveryCode,
      target_user_id: targetUserId
    });

    if (error) {
      console.error("Error promoting user to admin:", error);
      throw error;
    }

    return { data: success, error: null };
  } catch (error) {
    console.error("Exception in promoteUserToAdmin:", error);
    throw error;
  }
}
