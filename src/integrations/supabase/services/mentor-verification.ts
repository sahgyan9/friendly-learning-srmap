
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
    // First get the verification data to access application details
    const { data: verification, error: fetchError } = await supabase
      .from('mentor_verifications')
      .select('user_id, application_data')
      .eq('id', verificationId)
      .single();

    if (fetchError) {
      console.error('Error fetching verification:', fetchError);
      throw new Error(`Failed to fetch verification: ${fetchError.message}`);
    }

    // Update verification status
    const { error: updateError } = await supabase
      .from('mentor_verifications')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminId,
        rejection_reason: status === 'rejected' ? reason : null
      })
      .eq('id', verificationId);

    if (updateError) {
      console.error('Error updating verification:', updateError);
      throw new Error(`Failed to update verification: ${updateError.message}`);
    }

    // Update user verification status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({ verification_status: status })
      .eq('id', verification.user_id);

    if (userUpdateError) {
      console.error('Error updating user status:', userUpdateError);
      throw new Error(`Failed to update user status: ${userUpdateError.message}`);
    }

    // If approved, update mentor record with verification data
    if (status === 'approved' && verification.application_data) {
      const applicationData = verification.application_data as any;
      
      // Get user info
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('name, profile_image')
        .eq('id', verification.user_id)
        .single();

      if (userFetchError) {
        console.error('Error fetching user data:', userFetchError);
        throw new Error(`Failed to fetch user data: ${userFetchError.message}`);
      }

      // Update mentor record with verification data
      const { error: mentorUpdateError } = await supabase
        .from('mentors')
        .update({
          name: userData.name,
          department: applicationData.department || 'General',
          skills: applicationData.skills ? applicationData.skills.split(',').map((s: string) => s.trim()) : [],
          bio: applicationData.bio || null,
          linkedin_url: applicationData.linkedin_url || null,
          profile_image: userData.profile_image || null
        })
        .eq('id', verification.user_id);

      if (mentorUpdateError) {
        console.error('Error updating mentor record:', mentorUpdateError);
        throw new Error(`Failed to update mentor record: ${mentorUpdateError.message}`);
      }

      // Update user role to mentor
      const { error: roleUpdateError } = await supabase
        .from('users')
        .update({
          role: 'mentor',
          department: applicationData.department,
          skills: applicationData.skills ? applicationData.skills.split(',').map((s: string) => s.trim()) : [],
          bio: applicationData.bio,
          linkedin_url: applicationData.linkedin_url
        })
        .eq('id', verification.user_id);

      if (roleUpdateError) {
        console.error('Error updating user role:', roleUpdateError);
        throw new Error(`Failed to update user role: ${roleUpdateError.message}`);
      }
    }

    console.log('Verification status updated successfully');
    return { data: true, error: null };
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
