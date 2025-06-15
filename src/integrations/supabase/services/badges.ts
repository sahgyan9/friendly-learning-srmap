
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type BadgeType = Database['public']['Tables']['badge_types']['Row'];
export type UserBadge = Database['public']['Tables']['user_badges']['Row'];
export type CreateBadgeType = Database['public']['Tables']['badge_types']['Insert'];
export type AwardBadge = Database['public']['Tables']['user_badges']['Insert'];

export const getBadgeTypes = async () => {
  const { data, error } = await supabase
    .from('badge_types')
    .select('*')
    .order('category', { ascending: true });

  if (error) {
    console.error('Error fetching badge types:', error);
    throw error;
  }

  return { data, error: null };
};

export const createBadgeType = async (badge: CreateBadgeType) => {
  const { data, error } = await supabase
    .from('badge_types')
    .insert(badge)
    .select()
    .single();

  if (error) {
    console.error('Error creating badge type:', error);
    throw error;
  }

  return { data, error: null };
};

export const updateBadgeType = async (id: string, updates: Partial<CreateBadgeType>) => {
  const { data, error } = await supabase
    .from('badge_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating badge type:', error);
    throw error;
  }

  return { data, error: null };
};

export const deleteBadgeType = async (id: string) => {
  const { data, error } = await supabase
    .from('badge_types')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting badge type:', error);
    throw error;
  }

  return { data, error: null };
};

export const getUserBadges = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_badges')
    .select(`
      *,
      badge_type:badge_types(*),
      awarded_by_user:users!user_badges_awarded_by_fkey(name)
    `)
    .eq('user_id', userId)
    .order('awarded_at', { ascending: false });

  if (error) {
    console.error('Error fetching user badges:', error);
    throw error;
  }

  return { data, error: null };
};

export const awardBadge = async (badge: AwardBadge) => {
  const { data, error } = await supabase
    .from('user_badges')
    .insert(badge)
    .select(`
      *,
      badge_type:badge_types(*),
      user:users(name, email)
    `)
    .single();

  if (error) {
    console.error('Error awarding badge:', error);
    throw error;
  }

  return { data, error: null };
};

export const revokeBadge = async (userBadgeId: string) => {
  const { data, error } = await supabase
    .from('user_badges')
    .delete()
    .eq('id', userBadgeId);

  if (error) {
    console.error('Error revoking badge:', error);
    throw error;
  }

  return { data, error: null };
};

export const getBadgeStatistics = async () => {
  const { data: totalBadges, error: totalError } = await supabase
    .from('user_badges')
    .select('id', { count: 'exact' });

  const { data: badgesByCategory, error: categoryError } = await supabase
    .from('user_badges')
    .select(`
      badge_type:badge_types(category)
    `);

  if (totalError || categoryError) {
    console.error('Error fetching badge statistics:', totalError || categoryError);
    throw totalError || categoryError;
  }

  // Count badges by category
  const categoryStats = badgesByCategory?.reduce((acc: Record<string, number>, badge: any) => {
    const category = badge.badge_type?.category || 'unknown';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {}) || {};

  return {
    data: {
      totalBadges: totalBadges?.length || 0,
      categoryStats
    },
    error: null
  };
};

export const autoAwardPerformanceBadges = async () => {
  const { data, error } = await supabase.rpc('auto_award_performance_badges');

  if (error) {
    console.error('Error auto-awarding badges:', error);
    throw error;
  }

  return { data, error: null };
};
