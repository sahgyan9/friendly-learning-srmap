
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

  return (
    <header className="flex items-center gap-3 border-b bg-background px-3 py-3 sm:px-4">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

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

      <div className="min-w-0 flex-1">
        <h2 className="truncate font-semibold leading-tight">{displayName}</h2>
        {/* Presence is the useful line here — "Mentor" is already implied by
            the avatar badge and never changes. */}
        <p className="truncate text-xs text-muted-foreground">
          {isOnline ? "Online now" : isMentor ? "Mentor" : "Student"}
        </p>
      </div>

      {isMentor && otherUser?.id && (
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to={`/mentor/${otherUser.id}`}>View profile</Link>
        </Button>
      )}
    </header>
  );
};

export default ChatHeader;
