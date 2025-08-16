
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

    // If rejected, also create an additional notification with edit instructions
    if (status === 'rejected') {
      const { data: verification } = await supabase
        .from('mentor_verifications')
        .select('user_id')
        .eq('id', verificationId)
        .single();

      if (verification) {
        await supabase
          .from('notifications')
          .insert({
            user_id: verification.user_id,
            type: 'mentor_application',
            title: 'Edit Your Mentor Application',
            content: `Your mentor application was rejected with feedback. You can now edit and improve your application based on the admin's suggestions. Click here to edit: /become-mentor?edit=true`,
            data: {
              action: 'edit_application',
              verification_id: verificationId,
              edit_url: '/become-mentor?edit=true'
            }
          });
      }
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

// Update and resubmit a rejected mentor application
export const updateMentorApplication = async (
  userId: string,
  applicationData: Partial<CreateMentorVerification>
) => {
  console.log('Updating mentor application for user:', userId);

  try {
    // First check if user has a rejected application
    const { data: existingApp, error: fetchError } = await supabase
      .from('mentor_verifications')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching existing application:', fetchError);
      throw new Error(`Failed to fetch existing application: ${fetchError.message}`);
    }

    if (!existingApp) {
      throw new Error('No existing application found');
    }

    if (existingApp.status !== 'rejected') {
      throw new Error('Application is not in rejected status, cannot update');
    }

    // Update the existing application with new data and reset status to pending
    const updateData = {
      ...applicationData,
      status: 'pending',
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null
    };

    const { data, error } = await supabase
      .from('mentor_verifications')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating mentor application:', error);
      throw new Error(`Failed to update application: ${error.message}`);
    }

    console.log('Application updated and resubmitted successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Exception updating mentor application:', error);
    throw error;
  }
};

// Check if user can edit their application (i.e., has a rejected application)
export const canEditApplication = async (userId: string) => {
  try {
    const { data, error } = await getMentorVerification(userId);

    if (error) {
      return { canEdit: false, application: null, error };
    }

    const canEdit = data && data.status === 'rejected';
    return { canEdit, application: data, error: null };
  } catch (error) {
    console.error('Error checking edit eligibility:', error);
    return { canEdit: false, application: null, error };
  }
};
