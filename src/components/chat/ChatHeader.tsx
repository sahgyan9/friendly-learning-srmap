
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/utils/user-utils";
import { useUserPresenceRealtime } from "@/hooks/useUserPresenceRealtime";
import OnlineStatus from "./OnlineStatus";

interface ChatHeaderProps {
  conversation?: Conversation;
  getOtherUser: (conversation: Conversation) => any;
  /** Supplied on mobile, where the list and thread share the screen. */
  onBack?: () => void;
}

const ChatHeader = ({ conversation, getOtherUser, onBack }: ChatHeaderProps) => {
  const { isUserOnline } = useUserPresenceRealtime();

  if (!conversation) return null;

  const otherUser = getOtherUser(conversation);
  const displayName = otherUser?.name?.trim() || "User";
  const isOnline = isUserOnline(otherUser?.id);
  const isMentor = otherUser?.role === "mentor";

  const avatar = (
    <div className="relative shrink-0">
      <Avatar className="h-10 w-10">
        <AvatarImage src={otherUser?.profile_image} alt="" className="object-cover" />
        <AvatarFallback className="bg-primary/10 font-medium text-primary">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <span className="absolute -bottom-0.5 -right-0.5">
        <OnlineStatus isOnline={isOnline} size="sm" />
      </span>
    </div>
  );

  return (
    <header className="flex items-center gap-3 border-b bg-background px-3 py-3 sm:px-4">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* The avatar links too when there is a profile behind it, so the whole
          identity block behaves as one target rather than half of it. */}
      {isMentor && otherUser?.id ? (
        <Link to={`/mentor/${otherUser.id}`} tabIndex={-1} aria-hidden>
          {avatar}
        </Link>
      ) : (
        avatar
      )}

      <div className="min-w-0 flex-1">
        {/* The name is the profile link — a separate "View profile" button
            spent a whole control on something the name already affords. */}
        {isMentor && otherUser?.id ? (
          <Link
            to={`/mentor/${otherUser.id}`}
            className="block truncate font-semibold leading-tight hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {displayName}
          </Link>
        ) : (
          <h2 className="truncate font-semibold leading-tight">{displayName}</h2>
        )}

        {/* Presence is the useful second line — "Mentor" never changes. */}
        <p className="truncate text-xs text-muted-foreground">
          {isOnline ? "Online now" : isMentor ? "Mentor" : "Student"}
        </p>
      </div>
    </header>
  );
};

export default ChatHeader;
