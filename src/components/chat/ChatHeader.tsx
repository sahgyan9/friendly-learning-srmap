
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

  const displayName = otherUser?.name || "User";
  const role = otherUser?.role || "";
  const profileImage = otherUser?.profile_image;

  return (
    <div className="flex items-center px-6 py-4 border-b border-border bg-background">
      <Avatar className="h-10 w-10 mr-4 border-2 border-border">
        <AvatarImage 
          src={profileImage} 
          alt={displayName}
          className="object-cover"
        />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {getInitials(displayName)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground text-sm">{displayName}</h3>
        {role && (
          <p className="text-xs text-muted-foreground capitalize">
            {role === 'mentor' ? 'Mentor' : role}
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatHeader;
