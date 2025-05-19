
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
    if (!name || typeof name !== 'string') return 'U';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Ensure we have proper display values
  const displayName = otherUser?.name || "User";
  const role = otherUser?.role || "";
  const profileImage = otherUser?.profile_image;

  return (
    <div className="flex items-center p-4 border-b border-border bg-card">
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage src={profileImage} alt={displayName} />
        <AvatarFallback>{getInitials(otherUser?.name || '')}</AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-medium text-foreground">{displayName}</h3>
        {role && <p className="text-xs text-muted-foreground">{role}</p>}
      </div>
    </div>
  );
};

export default ChatHeader;
