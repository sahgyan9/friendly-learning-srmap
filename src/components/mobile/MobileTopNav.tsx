
import { useState } from "react";
import { Search, Bell, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import NotificationBell from "@/components/notifications/NotificationBell";

const MobileTopNav = () => {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-50 pt-safe">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left - Profile Avatar */}
        <Link to="/profile" className="flex-shrink-0">
          {user ? (
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={user.user_metadata?.full_name || user.email} />
              <AvatarFallback>
                {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </div>
          )}
        </Link>

        {/* Center - Search Bar */}
        <div className="flex-1 mx-4">
          {isSearchExpanded ? (
            <div className="relative">
              <Input
                type="text"
                placeholder="Search mentors..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                autoFocus
                onBlur={() => setIsSearchExpanded(false)}
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          ) : (
            <button
              onClick={() => setIsSearchExpanded(true)}
              className="w-full flex items-center justify-center py-2 px-4 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-300 dark:border-gray-600"
            >
              <Search className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Search</span>
            </button>
          )}
        </div>

        {/* Right - Notifications */}
        <div className="flex-shrink-0">
          {user ? (
            <NotificationBell />
          ) : (
            <Bell className="h-6 w-6 text-gray-600 dark:text-gray-400" />
          )}
        </div>
      </div>
    </header>
  );
};

export default MobileTopNav;
