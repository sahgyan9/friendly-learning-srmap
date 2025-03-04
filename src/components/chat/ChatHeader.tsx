
import React from "react";
import { Conversation } from "@/types/chat";

interface ChatHeaderProps {
  conversation: Conversation | undefined;
  getOtherUser: (conversation: Conversation) => any;
}

const ChatHeader = ({ conversation, getOtherUser }: ChatHeaderProps) => {
  if (!conversation) return null;
  
  const otherUser = getOtherUser(conversation);
  
  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-center gap-3">
        <img 
          src={otherUser?.profile_image} 
          alt={otherUser?.name} 
          className="w-10 h-10 rounded-full"
        />
        <h3 className="font-semibold">{otherUser?.name}</h3>
      </div>
    </div>
  );
};

export default ChatHeader;
