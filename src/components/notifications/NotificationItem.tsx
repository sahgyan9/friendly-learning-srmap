
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge, Star, MessageCircle, Settings, ChevronRight, UserPlus, Users, Award, Bell } from "lucide-react";
import { Notification } from "@/integrations/supabase/services/notifications";
import { getNotificationNavigationUrl, isNotificationClickable } from "@/utils/notificationNavigation";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onNotificationClick?: () => void; // Optional callback to close popover
}

const NotificationItem = ({ notification, onMarkAsRead, onNotificationClick }: NotificationItemProps) => {
  const getIcon = () => {
    const title = notification.title || "";
    const content = notification.content || "";

    if (title.includes("wants to join") || content.includes("asked to join")) {
      return <UserPlus className="h-4 w-4 text-emerald-500" />;
    }
    if (title.includes("invited to") || title.includes("You are in") || content.includes("joined")) {
      return <Users className="h-4 w-4 text-emerald-500" />;
    }
    if (title.includes("Mentor") || content.includes("mentor")) {
      return <Award className="h-4 w-4 text-purple-500" />;
    }

    switch (notification.type) {
      case 'badge':
        return <Star className="h-4 w-4 text-amber-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'system':
        return <Bell className="h-4 w-4 text-emerald-500" />;
      default:
        return <Badge className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleClick = () => {
    // Mark as read if not already read
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Navigate if the notification is clickable
    const navigationUrl = getNotificationNavigationUrl(notification);
    if (navigationUrl) {
      // Close the notification popover if callback provided
      onNotificationClick?.();

      // Perform full page reload to the desired URL to avoid authentication issues
      window.location.href = navigationUrl;
    }
  };

  const clickable = isNotificationClickable(notification);

  return (
    <Button
      variant="ghost"
      className={`w-full justify-start p-4 h-auto text-left ${clickable
          ? 'hover:bg-muted/50 cursor-pointer transition-colors'
          : 'hover:bg-muted/20 cursor-default'
        } ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
        }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 w-full">
        <div className="mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate flex-1">{notification.title}</p>
            <div className="flex items-center gap-1 flex-shrink-0">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
              {clickable && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          </div>
          {notification.content && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
              {notification.content}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at!), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Button>
  );
};

export default NotificationItem;
