import React from "react";
import { Conversation, Message } from "@/types/chat";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import SearchInput from "./SearchInput";

interface ChatContainerProps {
  conversations: Conversation[];
  filteredConversations: Conversation[];
  messages: Message[];
  activeChat: string | null;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUserId: string;
  formatTime: (timestamp: string) => string;
  getOtherUser: (conversation: Conversation) => any;
  setActiveChat: (id: string) => void;
  hasUnreadMessages: (conversationId: string) => boolean;
  handleSendMessage: (content: string) => Promise<void>;
}

const ChatContainer = ({
  conversations,
  filteredConversations,
  messages,
  activeChat,
  isLoadingConversations,
  isLoadingMessages,
  isSending,
  searchQuery,
  setSearchQuery,
  currentUserId,
  formatTime,
  getOtherUser,
  setActiveChat,
  hasUnreadMessages,
  handleSendMessage
}: ChatContainerProps) => {
  const currentConversation = conversations.find(c => c.id === activeChat);

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-[calc(100vh-200px)] flex">
      <div className="w-full md:w-1/3 border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>
        </div>
        
        <ConversationList 
          conversations={conversations}
          filteredConversations={filteredConversations}
          activeChat={activeChat}
          isLoading={isLoadingConversations}
          searchQuery={searchQuery}
          formatTime={formatTime}
          getOtherUser={getOtherUser}
          setActiveChat={setActiveChat}
          hasUnreadMessages={hasUnreadMessages}
        />
      </div>
      
      <div className="hidden md:flex flex-col flex-1">
        {activeChat && conversations.length > 0 ? (
          <>
            <ChatHeader 
              conversation={currentConversation} 
              getOtherUser={getOtherUser} 
            />
            
            <div className="flex-1 overflow-y-auto p-4">
              <MessageList 
                messages={messages}
                loading={isLoadingMessages}
                currentUserId={currentUserId}
              />
            </div>
            
            <div className="p-4 border-t border-gray-200">
              <MessageInput 
                onSendMessage={handleSendMessage}
                disabled={isLoadingMessages}
                sending={isSending}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground">
                Choose a conversation from the sidebar to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatContainer;
