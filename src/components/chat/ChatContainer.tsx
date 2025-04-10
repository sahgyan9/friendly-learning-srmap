import React, { useState, useCallback } from "react";
import { Conversation, Message } from "@/types/chat";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import SearchInput from "./SearchInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const currentConversation = conversations.find(c => c.id === activeChat);

  // Mobile view handling
  const showConversationList = !activeChat || mobileView === "list" || window.innerWidth >= 768;
  const showChatArea = activeChat && (mobileView === "chat" || window.innerWidth >= 768);

  // Function to get sender name based on sender ID
  const getSenderName = useCallback((senderId: string) => {
    // If it's the current user, return "You"
    if (senderId === currentUserId) return "You";

    // If message already has sender data attached, use that instead
    const messageWithSender = messages.find(m =>
      m.sender_id === senderId && m.sender && m.sender.name
    );
    if (messageWithSender?.sender?.name) {
      return messageWithSender.sender.name;
    }

    // If it's from the current conversation, get the other user's name
    if (currentConversation) {
      if (senderId === currentConversation.user1_id && currentConversation.user1) {
        return currentConversation.user1.name;
      }
      if (senderId === currentConversation.user2_id && currentConversation.user2) {
        return currentConversation.user2.name;
      }
    }

    // If we can't find the user, look through all conversations
    for (const conv of conversations) {
      if (senderId === conv.user1_id && conv.user1) {
        return conv.user1.name;
      }
      if (senderId === conv.user2_id && conv.user2) {
        return conv.user2.name;
      }
    }

    return "Contact"; // Fallback if we can't find the user
  }, [currentConversation, conversations, currentUserId, messages]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm h-[calc(100vh-200px)] flex">
      {/* Conversations list */}
      {showConversationList && (
        <div className={`${showChatArea && window.innerWidth >= 768 ? 'w-1/3' : 'w-full'} border-r border-gray-200 dark:border-gray-800 flex flex-col`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>

          <ScrollArea className="flex-1">
            <ConversationList
              conversations={conversations}
              filteredConversations={filteredConversations}
              activeChat={activeChat}
              isLoading={isLoadingConversations}
              searchQuery={searchQuery}
              formatTime={formatTime}
              getOtherUser={getOtherUser}
              setActiveChat={(id) => {
                setActiveChat(id);
                if (window.innerWidth < 768) {
                  setMobileView("chat");
                }
              }}
              hasUnreadMessages={hasUnreadMessages}
            />
          </ScrollArea>
        </div>
      )}

      {/* Chat area */}
      {showChatArea ? (
        <div className={`${showConversationList && window.innerWidth >= 768 ? 'w-2/3' : 'w-full'} flex flex-col`}>
          {/* Chat header with back button on mobile */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-800">
            {window.innerWidth < 768 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileView("list")}
                className="ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex-1">
              <ChatHeader
                conversation={currentConversation}
                getOtherUser={getOtherUser}
              />
            </div>
          </div>

          {/* Messages area */}
          <ScrollArea className="flex-1 p-4">
            <MessageList
              messages={messages}
              loading={isLoadingMessages}
              currentUserId={currentUserId}
              getSenderName={getSenderName}
            />
          </ScrollArea>

          {/* Message input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800">
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={isLoadingMessages}
              sending={isSending}
            />
          </div>
        </div>
      ) : (
        <div className="hidden md:flex md:w-2/3 items-center justify-center">
          <div className="text-center p-6">
            <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
            <p className="text-muted-foreground">
              Choose a conversation from the sidebar to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
