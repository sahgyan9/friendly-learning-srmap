
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

  // Function to get sender name based on sender ID with improved caching
  const getSenderName = useCallback((senderId: string) => {
    if (senderId === currentUserId) return "You";

    // Check messages for sender data first
    for (const msg of messages) {
      if (msg.sender && msg.sender.name && msg.sender_id === senderId) {
        return msg.sender.name;
      }
    }

    // Check current conversation users
    if (currentConversation) {
      if (currentConversation.user1_id === senderId && currentConversation.user1?.name) {
        return currentConversation.user1.name;
      }
      if (currentConversation.user2_id === senderId && currentConversation.user2?.name) {
        return currentConversation.user2.name;
      }
    }

    // Check all conversations as fallback
    for (const conv of conversations) {
      if (senderId === conv.user1_id && conv.user1?.name) {
        return conv.user1.name;
      }
      if (senderId === conv.user2_id && conv.user2?.name) {
        return conv.user2.name;
      }
    }

    console.warn(`Could not find name for user ID: ${senderId}`);
    return "User";
  }, [currentConversation, conversations, currentUserId, messages]);

  return (
    <div className="bg-background border border-border rounded-xl shadow-sm h-[calc(100vh-200px)] flex overflow-hidden">
      {/* Conversations list */}
      {showConversationList && (
        <div className={`${showChatArea && window.innerWidth >= 768 ? 'w-80' : 'w-full'} border-r border-border flex flex-col bg-background`}>
          <div className="px-4 py-4 border-b border-border">
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
              currentUserId={currentUserId}
            />
          </ScrollArea>
        </div>
      )}

      {/* Chat area */}
      {showChatArea ? (
        <div className={`${showConversationList && window.innerWidth >= 768 ? 'flex-1' : 'w-full'} flex flex-col bg-background`}>
          {/* Chat header with back button on mobile */}
          <div className="flex items-center">
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
          <ScrollArea className="flex-1">
            <MessageList
              messages={messages}
              loading={isLoadingMessages}
              currentUserId={currentUserId}
              conversationId={activeChat}
              getSenderName={getSenderName}
            />
          </ScrollArea>

          {/* Message input */}
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoadingMessages}
            sending={isSending}
            conversationId={activeChat}
            userId={currentUserId}
          />
        </div>
      ) : (
        <div className="hidden md:flex md:flex-1 items-center justify-center bg-muted/30">
          <div className="text-center p-6">
            <h3 className="text-lg font-medium mb-2 text-foreground">Select a conversation</h3>
            <p className="text-muted-foreground text-sm">
              Choose a conversation from the sidebar to start chatting
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatContainer;
