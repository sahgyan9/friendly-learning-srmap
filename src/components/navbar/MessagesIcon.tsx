import { Link, useLocation } from "react-router-dom";
import { MessageCircleMore } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

/**
 * The messages button in the header's account cluster.
 *
 * A filled circle rather than a bare glyph: it sits next to the notification
 * bell and the avatar, and three items of three different shapes read as
 * clutter. The circle is what makes them a set.
 *
 * The count badge carries `ring-background`, not a border — the header is
 * translucent with a backdrop blur, so a border would let page content show
 * between the badge and the icon behind it.
 */
const MessagesIcon = () => {
  const { user } = useAuth();
  const location = useLocation();
  const unreadCount = useUnreadMessages();

  if (!user) return null;

  const isActive = location.pathname.startsWith("/messages");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/messages"
          aria-label={
            unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"
          }
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive
              ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
              : "bg-muted text-foreground/80 hover:bg-muted/70 hover:text-foreground",
          )}
        >
          <MessageCircleMore className="h-5 w-5" aria-hidden />

          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-background"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">Messages</TooltipContent>
    </Tooltip>
  );
};

export default MessagesIcon;
