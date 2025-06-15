
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge, Star, MessageCircle, Settings } from "lucide-react";
import { Notification } from "@/integrations/supabase/services/notifications";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem = ({ notification, onMarkAsRead }: NotificationItemProps) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'badge':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'system':
        return <Settings className="h-4 w-4 text-gray-500" />;
      default:
        return <Badge className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  return (
    <Button
      variant="ghost"
      className={`w-full justify-start p-4 h-auto text-left hover:bg-muted/50 ${
        !notification.read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3 w-full">
        <div className="mt-1">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium text-sm truncate">{notification.title}</p>
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
            )}
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
