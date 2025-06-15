
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  getUserNotifications, 
  getUnreadNotificationsCount, 
  subscribeToNotifications,
  Notification 
} from "@/integrations/supabase/services/notifications";

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const [notificationsResult, unreadResult] = await Promise.all([
          getUserNotifications(user.id),
          getUnreadNotificationsCount(user.id)
        ]);

        if (notificationsResult.data) {
          setNotifications(notificationsResult.data);
        }

        if (unreadResult.data !== null) {
          setUnreadCount(unreadResult.data);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to real-time notifications
    const unsubscribe = subscribeToNotifications(user.id, (newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return unsubscribe;
  }, [user]);

  return {
    notifications,
    unreadCount,
    loading,
    setNotifications,
    setUnreadCount
  };
};
