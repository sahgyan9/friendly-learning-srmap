
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge, Star, MessageCircle, ChevronRight, UserPlus, Users, Award, Bell } from "lucide-react";
import { Notification } from "@/integrations/supabase/services/notifications";
import { getNotificationNavigationUrl, isNotificationClickable } from "@/utils/notificationNavigation";
import { cn } from "@/lib/utils";

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
      return <UserPlus className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
    if (title.includes("invited to") || title.includes("You are in") || content.includes("joined")) {
      return <Users className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
    if (title.includes("Mentor") || content.includes("mentor")) {
      return <Award className="h-4 w-4 text-purple-500 shrink-0" />;
    }

    switch (notification.type) {
      case 'badge':
        return <Star className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500 shrink-0" />;
      case 'system':
        return <Bell className="h-4 w-4 text-emerald-500 shrink-0" />;
      default:
        return <Badge className="h-4 w-4 text-muted-foreground shrink-0" />;
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
      className={cn(
        "w-full justify-start p-3.5 h-auto text-left whitespace-normal rounded-none border-b border-border/40 last:border-0",
        clickable
          ? "hover:bg-muted/60 cursor-pointer transition-colors"
          : "hover:bg-muted/20 cursor-default",
        !notification.read && "bg-blue-50/70 dark:bg-blue-950/30"
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 w-full min-w-0">
        <div className="mt-0.5 shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-semibold text-xs leading-snug text-foreground break-words min-w-0 flex-1">
              {notification.title}
            </p>
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
              {clickable && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </div>
          </div>
          {notification.content && (
            <p className="text-xs text-muted-foreground leading-relaxed break-words line-clamp-3 mb-1">
              {notification.content}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground/80 font-medium">
            {formatDistanceToNow(new Date(notification.created_at!), { addSuffix: true })}
          </p>
        </div>
      </div>
    </Button>
  );
};

export default NotificationItem;
