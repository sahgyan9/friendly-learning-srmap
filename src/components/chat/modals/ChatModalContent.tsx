
import MessageList from "@/components/chat/MessageList";
import MessageInput from "@/components/chat/MessageInput";
import { Message } from "@/types/chat";

interface ChatModalContentProps {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  currentUserId: string;
  conversationId: string | null;
  onSendMessage: (content: string) => Promise<void>;
}

const ChatModalContent = ({ 
  messages, 
  loading, 
  sending, 
  currentUserId,
  conversationId,
  onSendMessage 
}: ChatModalContentProps) => {
  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList 
          messages={messages} 
          loading={loading} 
          currentUserId={currentUserId}
          conversationId={conversationId}
        />
      </div>
      
      {/* Message input */}
      <div className="p-3 border-t">
        <MessageInput 
          onSendMessage={onSendMessage}
          disabled={loading}
          sending={sending}
          conversationId={conversationId}
          userId={currentUserId}
        />
      </div>
    </>
  );
};

export default ChatModalContent;
