
import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatHeaderProps {
  conversation?: Conversation;
  getOtherUser: (conversation: Conversation) => any;
}

const ChatHeader = ({ conversation, getOtherUser }: ChatHeaderProps) => {
  if (!conversation) return null;

  const otherUser = getOtherUser(conversation);

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Default to "User" if we couldn't resolve a name
  const displayName = otherUser?.name || (conversation.user1_id ? "User" : "Contact");
  
  // Add a visual indicator for missing user data
  const isMissingData = !otherUser?.name;

  return (
    <div className="flex items-center p-4 border-b border-border bg-card">
      <Avatar className={`h-10 w-10 mr-3 ${isMissingData ? 'border border-amber-500' : ''}`}>
        <AvatarImage src={otherUser?.profile_image} alt={displayName} />
        <AvatarFallback>{getInitials(otherUser?.name || displayName)}</AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">{displayName}</h3>
          {isMissingData && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
              Missing Data
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{otherUser?.role || ""}</p>
      </div>
    </div>
  );
};

export default ChatHeader;
