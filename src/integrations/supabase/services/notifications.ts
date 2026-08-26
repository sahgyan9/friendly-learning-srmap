
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

export type Notification = Database['public']['Tables']['notifications']['Row'];
export type CreateNotification = Database['public']['Tables']['notifications']['Insert'];

export const getUserNotifications = async (userId: string, limit: number = 50) => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return { data, error: null };
};

export const getUnreadNotificationsCount = async (userId: string) => {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error fetching unread count:', error);
    throw error;
  }

  return { data: count || 0, error: null };
};

export const markNotificationAsRead = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }

  return { data, error: null };
};

export const markAllNotificationsAsRead = async (userId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }

  return { data, error: null };
};

export const createNotification = async (notification: CreateNotification) => {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  // Dispatch instant background push notification
  if (data?.user_id) {
    try {
      import("@/lib/push/pushService").then(({ dispatchPushNotification }) => {
        const rawData = notification.data as any;
        const navUrl = rawData?.url || '/';
        dispatchPushNotification({
          userIds: [data.user_id],
          title: notification.title || "Friendly Learning SRMAP",
          body: notification.content || "You have a new notification.",
          url: typeof navUrl === 'string' ? navUrl : '/',
          tag: `notif-${data.id}`,
        }).catch(() => {});
      });
    } catch {
      // Fire-and-forget
    }
  }

  return { data, error: null };
};

export const deleteNotification = async (notificationId: string) => {
  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }

  return { data, error: null };
};

/**
 * Notifies the caller that something changed for this user's notifications —
 * a new one arrived, one was marked read (possibly from another tab/device),
 * or one was deleted. Deliberately payload-less: `notifications` has default
 * replica identity, so UPDATE/DELETE events only carry the primary key in
 * `payload.old`, not the fields that changed. The caller re-fetches instead
 * of trying to patch state from the event.
 */
export const subscribeToNotifications = (userId: string, onChange: () => void) => {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
