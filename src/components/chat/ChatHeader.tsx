
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Video, Phone, ShieldCheck } from "lucide-react";
import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getInitials } from "@/utils/user-utils";
import { useUserPresenceRealtime } from "@/hooks/useUserPresenceRealtime";
import OnlineStatus from "./OnlineStatus";
import { cn } from "@/lib/utils";
import CallComingSoonModal, { type CallType } from "./CallComingSoonModal";

interface ChatHeaderProps {
  conversation?: Conversation;
  getOtherUser: (conversation: Conversation) => any;
  /** Supplied on mobile, where the list and thread share the screen. */
  onBack?: () => void;
}

const ChatHeader = ({ conversation, getOtherUser, onBack }: ChatHeaderProps) => {
  const { isUserOnline } = useUserPresenceRealtime();
  const [activeCall, setActiveCall] = useState<CallType>(null);

  if (!conversation) return null;

  const otherUser = getOtherUser(conversation);
  const displayName = otherUser?.name?.trim() || "User";
  const isOnline = isUserOnline(otherUser?.id);
  const isMentor = otherUser?.role === "mentor";

  return (
    <>
      <header className="relative flex items-center gap-3 border-b border-border/70 bg-card/95 dark:border-white/8 dark:bg-card/85 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-3 backdrop-blur-md sm:px-4">
        {/* Gradient accent line at the bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to conversations"
            className="shrink-0 rounded-xl hover:bg-white/8"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {/* Avatar with online ring */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "rounded-full p-0.5 transition-all duration-300",
              isOnline
                ? "bg-gradient-to-br from-emerald-400/60 via-primary/40 to-transparent"
                : "bg-white/8",
            )}
          >
            <Avatar className="h-10 w-10 ring-1 ring-background">
              {isMentor && otherUser?.id ? (
                <Link to={`/mentor/${otherUser.id}`} tabIndex={-1} aria-hidden>
                  <AvatarImage src={otherUser?.profile_image} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Link>
              ) : (
                <>
                  <AvatarImage src={otherUser?.profile_image} alt="" className="object-cover" />
                  <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </div>
          <span className="absolute -bottom-0.5 -right-0.5">
            <OnlineStatus isOnline={isOnline} size="sm" />
          </span>
        </div>

        {/* Name + status */}
        <div className="min-w-0 flex-1">
          {isMentor && otherUser?.id ? (
            <Link
              to={`/mentor/${otherUser.id}`}
              className="flex min-w-0 items-center gap-1.5 font-semibold leading-tight transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="truncate">{displayName}</span>
              <Badge variant="secondary" className="h-4 shrink-0 px-1 text-4xs">
                <ShieldCheck className="mr-0.5 inline h-2.5 w-2.5" /> Mentor
              </Badge>
            </Link>
          ) : (
            <h2 className="truncate font-semibold leading-tight">{displayName}</h2>
          )}

          <div className="mt-0.5 flex items-center gap-1.5">
            <p
              className={cn(
                "truncate text-xs font-medium",
                isOnline ? "text-emerald-400" : "text-muted-foreground/70",
              )}
            >
              {isOnline ? "Online now" : isMentor ? "Mentor · Offline" : "Student · Offline"}
            </p>
          </div>
        </div>

        {/* Call action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-white/8 hover:text-foreground"
            aria-label="Voice call"
            onClick={() => setActiveCall("voice")}
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-white/8 hover:text-foreground"
            aria-label="Video call"
            onClick={() => setActiveCall("video")}
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Coming-soon modal */}
      <CallComingSoonModal
        callType={activeCall}
        recipientName={displayName}
        onClose={() => setActiveCall(null)}
      />
    </>
  );
};

export default ChatHeader;
