
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export const useChatConnection = (userId: string, setActiveChat: (id: string) => void) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessingChat, setIsProcessingChat] = useState(false);
  const chatProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    const chatId = searchParams.get('chat');
    
    // Skip if no chat ID, no user, or already processing this chat
    if (!chatId || !userId || isProcessingChat || chatProcessedRef.current === chatId) {
      return;
    }

    const handleChatConnection = async () => {
      setIsProcessingChat(true);
      chatProcessedRef.current = chatId;
      
      try {
        console.log('Setting active chat to:', chatId);
        
        // Set the active chat immediately
        setActiveChat(chatId);
        
        // Clear the chat parameter from URL after successful connection
        setSearchParams(params => {
          params.delete('chat');
          return params;
        });
        
        console.log('Chat connection completed successfully');
        
      } catch (err) {
        console.error('Exception during chat connection:', err);
        toast.error("An unexpected error occurred while opening the chat");
      } finally {
        setIsProcessingChat(false);
      }
    };
    
    handleChatConnection();
  }, [searchParams, userId, isProcessingChat, setSearchParams, setActiveChat]);

  return { isProcessingChat };
};
