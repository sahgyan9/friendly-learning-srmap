
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type MentorVerification = Database['public']['Tables']['mentor_verifications']['Row'];
export type CreateMentorVerification = Database['public']['Tables']['mentor_verifications']['Insert'];

export const submitMentorApplication = async (application: CreateMentorVerification) => {
  const { data, error } = await supabase
    .from('mentor_verifications')
    .insert(application)
    .select()
    .single();

  if (error) {
    console.error('Error submitting mentor application:', error);
    throw error;
  }

  return { data, error: null };
};

export const getMentorVerification = async (userId: string) => {
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
    throw error;
  }

  return { data, error: null };
};

export const getAllMentorVerifications = async (status?: string) => {
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
    throw error;
  }

  return { data, error: null };
};

export const updateVerificationStatus = async (
  verificationId: string,
  status: 'approved' | 'rejected',
  adminId: string,
  reason?: string
) => {
  const { data, error } = await supabase.rpc('update_verification_status', {
    verification_id: verificationId,
    new_status: status,
    admin_id: adminId,
    reason: reason || null
  });

  if (error) {
    console.error('Error updating verification status:', error);
    throw error;
  }

  return { data, error: null };
};

export const getVerificationStatistics = async () => {
  const { data: stats, error } = await supabase
    .from('mentor_verifications')
    .select('status');

  if (error) {
    console.error('Error fetching verification statistics:', error);
    throw error;
  }

  const statusCounts = stats?.reduce((acc: Record<string, number>, verification) => {
    acc[verification.status || 'unknown'] = (acc[verification.status || 'unknown'] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    data: {
      total: stats?.length || 0,
      pending: statusCounts.pending || 0,
      approved: statusCounts.approved || 0,
      rejected: statusCounts.rejected || 0
    },
    error: null
  };
};
