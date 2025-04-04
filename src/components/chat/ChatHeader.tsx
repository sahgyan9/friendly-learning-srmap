
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
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-800">
      <Avatar className="h-10 w-10 mr-3">
        <AvatarImage src={otherUser?.profile_image} alt={otherUser?.name || "User"} />
        <AvatarFallback>{otherUser?.name ? getInitials(otherUser.name) : 'U'}</AvatarFallback>
      </Avatar>
      <div>
        <h3 className="font-medium">{otherUser?.name || "Unknown User"}</h3>
        <p className="text-xs text-muted-foreground">{otherUser?.role || ""}</p>
      </div>
    </div>
  );
};

export default ChatHeader;
