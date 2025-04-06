import { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatHeaderProps {
  conversation?: Conversation;
  getOtherUser: (conversation: Conversation) => any;
}

const ChatHeader = ({ conversation, getOtherUser }: ChatHeaderProps) => {
  if (!conversation) return null;

  const otherUser = getOtherUser(conversation);
  const currentUserId = conversation.user1_id; // Assuming we're always user1 for simplicity
  const otherUserId = otherUser?.id || (conversation.user1_id === currentUserId ? conversation.user2_id : conversation.user1_id);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const displayName = otherUser && otherUser.name
    ? otherUser.name
    : "User " + otherUserId.substring(0, 5);

  return (
    <div className="flex items-center p-4 border-b border-border bg-card">
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage src={otherUser?.profile_image} alt={displayName} />
        <AvatarFallback>{otherUser?.name ? getInitials(otherUser.name) : 'U'}</AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-medium text-foreground">{displayName}</h3>
        <p className="text-xs text-muted-foreground">{otherUser?.role || ""}</p>
      </div>
    </div>
  );
};

export default ChatHeader;
