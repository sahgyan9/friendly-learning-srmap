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

/** One row of public.user_badges_public(uuid). Flat, because the RPC is. */
type PublicUserBadgeRow = {
  id: string;
  user_id: string;
  badge_type_id: string;
  awarded_by: string | null;
  awarded_at: string;
  notes: string | null;
  awarded_by_name: string | null;
  badge_name: string | null;
  badge_description: string | null;
  badge_icon: string | null;
  badge_color: string | null;
  badge_category: string | null;
  badge_created_at: string | null;
  badge_updated_at: string | null;
};

/** A badge row with its type inlined, plus the awarder's display name. */
export type UserBadgeWithType = UserBadge & {
  badge_type: BadgeType | null;
  awarder: { name: string | null } | null;
};

/**
 * Badges held by one user.
 *
 * Goes through the user_badges_public RPC rather than selecting from
 * user_badges directly: the old query embedded
 * `awarder:users!user_badges_awarded_by_fkey(name)`, and public.users is
 * owner-only for SELECT. PostgREST resolves an embed in the same statement, so
 * the whole request 401'd with `42501 permission denied for table users` for
 * every signed-out visitor to a mentor profile -- and BadgeDisplay's empty
 * state made that look like "no badges" rather than a failure.
 */
export const getUserBadges = async (userId: string) => {
  const { data, error } = await supabase
    .rpc('user_badges_public' as never, { p_user_id: userId } as never);

  if (error) {
    console.error('Error fetching user badges:', error);
    throw error;
  }

  const rows = (data ?? []) as unknown as PublicUserBadgeRow[];

  // Rebuild the nested shape the callers were already written against, so this
  // stays a transport change and nothing downstream has to know about it.
  const badges: UserBadgeWithType[] = rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    badge_type_id: row.badge_type_id,
    awarded_by: row.awarded_by,
    awarded_at: row.awarded_at,
    notes: row.notes,
    badge_type: row.badge_name === null
      ? null
      : {
          id: row.badge_type_id,
          name: row.badge_name,
          description: row.badge_description,
          icon: row.badge_icon,
          color: row.badge_color,
          category: row.badge_category,
          created_at: row.badge_created_at,
          updated_at: row.badge_updated_at,
        },
    awarder: row.awarded_by_name === null ? null : { name: row.awarded_by_name },
  }));

  return { data: badges, error: null };
};

export const awardBadge = async (badge: AwardBadge) => {
  const { data, error } = await supabase
    .from('user_badges')
    .insert(badge)
    .select(`
      *,
      badge_type:badge_types(*),
      recipient:users!user_badges_user_id_fkey(name, email)
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
  const categoryStats = badgesByCategory?.reduce((acc: Record<string, number>, badge) => {
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
