
import { supabase } from "@/integrations/supabase/client";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  profile_image?: string;
  role: string;
  department?: string;
  skills?: string[];
  linkedin_url?: string;
  bio?: string;
  phone?: string;
  mobile?: string;
  verification_status?: string;
  is_admin: boolean;
  is_available?: boolean;
  created_at?: string;
}

export const getUserById = async (userId: string) => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }

  return data;
};
