
import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/context/AuthContext";

const MessagesIcon = () => {
  const { user } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadMessages();
  
  if (!user) return null;

  const isActive = location.pathname === '/messages';

  return (
    <Link to="/messages">
      <Button 
        variant="ghost" 
        size="sm" 
        className={`relative ${isActive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  );
};

export default MessagesIcon;
