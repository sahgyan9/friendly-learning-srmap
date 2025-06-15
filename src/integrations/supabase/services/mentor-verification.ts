
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type MentorVerification = Database['public']['Tables']['mentor_verifications']['Row'];
export type CreateMentorVerification = Database['public']['Tables']['mentor_verifications']['Insert'];

export const submitMentorApplication = async (application: CreateMentorVerification) => {
  console.log('Submitting mentor application:', application);
  
  const { data, error } = await supabase
    .from('mentor_verifications')
    .insert(application)
    .select()
    .single();

  if (error) {
    console.error('Error submitting mentor application:', error);
    throw new Error(`Failed to submit application: ${error.message}`);
  }

  console.log('Application submitted successfully:', data);
  return { data, error: null };
};

export const getMentorVerification = async (userId: string) => {
  console.log('Fetching mentor verification for user:', userId);
  
  const { data, error } = await supabase
    .from('mentor_verifications')
    .select(`
      *,
      reviewed_by_user:users!mentor_verifications_reviewed_by_fkey(name, email)
    `)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching mentor verification:', error);
    throw new Error(`Failed to fetch verification: ${error.message}`);
  }

  return { data, error: null };
};

export const getAllMentorVerifications = async (status?: string) => {
  console.log('Fetching all mentor verifications with status:', status);
  
  let query = supabase
    .from('mentor_verifications')
    .select(`
      *,
      user:users!mentor_verifications_user_id_fkey(name, email, department),
      reviewed_by_user:users!mentor_verifications_reviewed_by_fkey(name, email)
    `)
    .order('submitted_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching mentor verifications:', error);
    throw new Error(`Failed to fetch verifications: ${error.message}`);
  }

  console.log('Fetched verifications:', data?.length || 0);
  return { data, error: null };
};

export const updateVerificationStatus = async (
  verificationId: string,
  status: 'approved' | 'rejected',
  adminId: string,
  reason?: string
) => {
  console.log('Updating verification status:', {
    verificationId,
    status,
    adminId,
    reason
  });

  try {
    const { data, error } = await supabase.rpc('update_verification_status', {
      verification_id: verificationId,
      new_status: status,
      admin_id: adminId,
      reason: reason || null
    });

    if (error) {
      console.error('RPC Error updating verification status:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log('Verification status updated successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Exception updating verification status:', error);
    throw error;
  }
};

export const getVerificationStatistics = async () => {
  console.log('Fetching verification statistics');
  
  const { data: stats, error } = await supabase
    .from('mentor_verifications')
    .select('status');

  if (error) {
    console.error('Error fetching verification statistics:', error);
    throw new Error(`Failed to fetch statistics: ${error.message}`);
  }

  const statusCounts = stats?.reduce((acc: Record<string, number>, verification) => {
    acc[verification.status || 'unknown'] = (acc[verification.status || 'unknown'] || 0) + 1;
    return acc;
  }, {}) || {};

  const result = {
    total: stats?.length || 0,
    pending: statusCounts.pending || 0,
    approved: statusCounts.approved || 0,
    rejected: statusCounts.rejected || 0
  };

  console.log('Verification statistics:', result);
  return { data: result, error: null };
};
