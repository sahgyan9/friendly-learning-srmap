
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type MentorVerification = Database['public']['Tables']['mentor_verifications']['Row'];
export type CreateMentorVerification = Database['public']['Tables']['mentor_verifications']['Insert'];

export const submitMentorApplication = async (application: CreateMentorVerification) => {
  // First check if user already has an application
  const { data: existingApp, error: checkError } = await supabase
    .from('mentor_verifications')
    .select('*')
    .eq('user_id', application.user_id)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Failed to check existing application: ${checkError.message}`);
  }

  if (existingApp) {
    throw new Error(`You already have a ${existingApp.status} mentor application. Please check your profile for status updates.`);
  }

  const { data, error } = await supabase
    .from('mentor_verifications')
    .insert(application)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to submit application: ${error.message}`);
  }

  return { data, error: null };
};

/**
 * Whether another account already claims this enrollment number.
 *
 * Goes through an RPC rather than a table query because RLS on public.users
 * restricts SELECT to the caller's own row — a direct query would always report
 * the ID as free. The RPC returns a bare boolean and never reveals the holder.
 *
 * Fails open: a network error must not stop someone applying, and the insert
 * trigger re-checks and flags duplicates regardless.
 */
export const isCollegeIdTaken = async (collegeId: string): Promise<boolean> => {
  const { data, error } = await supabase.rpc("is_college_id_taken", {
    p_college_id: collegeId,
  });

  if (error) {
    console.error("Error checking College ID:", error);
    return false;
  }

  return data === true;
};

export const getMentorVerification = async (userId: string) => {
  if (!userId) {
    return { data: null, error: { message: 'User ID is required' } };
  }

  try {
    const { data, error } = await supabase
      .from('mentor_verifications')
      .select(`
        *,
        reviewed_by_user:users!mentor_verifications_reviewed_by_fkey(name, email)
      `)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch verification: ${error.message}`);
    }

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message || 'Failed to fetch verification' } };
  }
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
    throw new Error(`Failed to fetch verifications: ${error.message}`);
  }

  return { data, error: null };
};

export const updateVerificationStatus = async (
  verificationId: string,
  status: 'approved' | 'rejected',
  adminId: string,
  reason?: string
) => {
  try {
    const { data, error } = await supabase.rpc('update_verification_status', {
      verification_id: verificationId,
      new_status: status,
      admin_id: adminId,
      reason: reason || null
    });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // Enhanced notification system for rejections
    if (status === 'rejected') {
      const { data: verification } = await supabase
        .from('mentor_verifications')
        .select('user_id')
        .eq('id', verificationId)
        .single();

      if (verification) {
        // Create enhanced notifications for rejected applications
        const notifications = [
          {
            user_id: verification.user_id,
            type: 'mentor_application',
            title: '🚨 URGENT: Mentor Application Rejected - Action Required',
            content: `Your mentor application was rejected and needs immediate attention. Admin feedback: "${reason || 'No specific reason provided'}". Click here to edit and resubmit your application: /become-mentor?edit=true`,
            data: {
              action: 'edit_application',
              verification_id: verificationId,
              edit_url: '/become-mentor?edit=true',
              rejection_reason: reason,
              priority: 'high'
            }
          },
          {
            user_id: verification.user_id,
            type: 'system',
            title: '📝 Your Data is Safe - Ready to Edit Application',
            content: `Don't worry! All your previous application data has been preserved. You can now edit your mentor application with the admin feedback and resubmit it. Visit: /become-mentor?edit=true`,
            data: {
              action: 'edit_application',
              verification_id: verificationId,
              edit_url: '/become-mentor?edit=true',
              data_preserved: true
            }
          },
          {
            user_id: verification.user_id,
            type: 'reminder',
            title: '⏰ Don\'t Miss Out - Edit Your Mentor Application',
            content: `You have a mentor application that needs updates. Make the suggested improvements and resubmit to join our mentor community. Your application data is waiting for you.`,
            data: {
              action: 'edit_application',
              verification_id: verificationId,
              edit_url: '/become-mentor?edit=true',
              reminder: true
            }
          }
        ];

        for (const notification of notifications) {
          await supabase
            .from('notifications')
            .insert(notification);
        }

        console.log('Enhanced rejection notifications created for user:', verification.user_id);
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
  console.log('Updating mentor application for user:', userId, applicationData);

  try {
    // First check if user has a rejected application using maybeSingle
    const { data: existingApp, error: fetchError } = await supabase
      .from('mentor_verifications')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing application:', fetchError);
      return { data: null, error: { message: `Failed to fetch existing application: ${fetchError.message}` } };
    }

    if (!existingApp) {
      return { data: null, error: { message: 'No existing application found' } };
    }

    if (existingApp.status !== 'rejected') {
      return { data: null, error: { message: 'Application is not in rejected status, cannot update' } };
    }

    // Update the existing application with new data and reset status to pending
    const updateData = {
      ...applicationData,
      status: 'pending' as const,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      rejection_reason: null
    };

    console.log('Updating with data:', updateData);

    const { data, error } = await supabase
      .from('mentor_verifications')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating mentor application:', error);
      return { data: null, error: { message: `Failed to update application: ${error.message}` } };
    }

    if (!data) {
      return { data: null, error: { message: 'No application was updated' } };
    }

    // Create comprehensive success notifications
    const successNotifications = [
      {
        user_id: userId,
        type: 'system',
        title: '✅ Application Successfully Resubmitted!',
        content: 'Great news! Your updated mentor application has been resubmitted and is now under review. Our team will carefully review your improvements and get back to you soon.',
        data: {
          action: 'application_resubmitted',
          verification_id: data.id,
          status: 'success'
        }
      },
      {
        user_id: userId,
        type: 'mentor_application',
        title: '📋 Application Status: Under Review',
        content: 'Your mentor application is now being reviewed by our team. You can check the status anytime by visiting your profile or the mentor application page.',
        data: {
          action: 'application_under_review',
          verification_id: data.id,
          status_url: '/become-mentor'
        }
      }
    ];

    for (const notification of successNotifications) {
      await supabase
        .from('notifications')
        .insert(notification);
    }

    console.log('Application updated and resubmitted successfully:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Exception updating mentor application:', error);
    return { data: null, error: { message: error instanceof Error ? error.message : 'Unknown error occurred' } };
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
