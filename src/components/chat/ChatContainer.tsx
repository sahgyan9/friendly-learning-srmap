
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, Message } from "@/types/chat";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import SearchInput from "./SearchInput";
import { MessageCircleMore, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Measures actual space left below the element, in px, instead of guessing it.
 *
 * This used to be a hard-coded `calc(100dvh-9rem)` that assumed the site
 * header's height. SiteHeader mounts once above <Routes> and stays alive
 * across navigations, so its collapsible second row can already be collapsed
 * (or the "Connecting with mentor…" line can be showing) by the time this
 * page appears — the guess and the real header height then disagree.
 */
function useAvailableHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const recalc = () => {
      const top = Math.max(el.getBoundingClientRect().top, 0);
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const bottomPadding = 16; // leave comfort space at the bottom of the screen
      const computed = Math.max(viewportHeight - top - bottomPadding, 320);
      setHeight(computed);
    };

    recalc();

    const resizeObserver = new ResizeObserver(recalc);
    resizeObserver.observe(document.body);

    window.addEventListener("resize", recalc);
    window.visualViewport?.addEventListener("resize", recalc);
    window.visualViewport?.addEventListener("scroll", recalc);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalc);
      window.visualViewport?.removeEventListener("resize", recalc);
      window.visualViewport?.removeEventListener("scroll", recalc);
    };
  }, []);

  return { ref, height };
}

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
  getUnreadCount: (conversationId: string) => number;
  handleSendMessage: (content: string, replyTo?: Message | null) => Promise<void>;
  handleEditMessage?: (messageId: string, content: string) => Promise<any>;
  handleDeleteMessage?: (messageId: string) => Promise<any>;
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
  getUnreadCount,
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
}: ChatContainerProps) => {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const { ref: heightRef, height: availableHeight } = useAvailableHeight<HTMLDivElement>();

  const currentConversation = conversations.find((c) => c.id === activeChat);

  useEffect(() => {
    if (activeChat && isMobile) {
      setMobileView("chat");
    } else if (!activeChat && isMobile) {
      setMobileView("list");
    }
  }, [activeChat, isMobile]);

  // Reset replying & editing state when changing conversations
  useEffect(() => {
    setReplyingTo(null);
    setEditingMessage(null);
  }, [activeChat]);

  const showList = !isMobile || mobileView === "list";
  const showChat = !isMobile ? Boolean(activeChat) : mobileView === "chat" && Boolean(activeChat);

  const namesById = useMemo(() => {
    const names = new Map<string, string>();

    const record = (id?: string, name?: string | null) => {
      if (!id || !name) return;
      const trimmed = name.trim();
      if (!trimmed || names.has(id)) return;
      names.set(id, trimmed);
    };

    for (const conversation of conversations) {
      record(conversation.user1_id, conversation.user1?.name);
      record(conversation.user2_id, conversation.user2?.name);
    }
    for (const message of messages) {
      record(message.sender_id, message.sender?.name);
    }

    return names;
  }, [conversations, messages]);

  const getSenderName = useCallback(
    (senderId: string) => {
      if (senderId === currentUserId) return "You";
      return namesById.get(senderId) ?? "User";
    },
    [namesById, currentUserId],
  );

  return (
    /* Glassmorphic outer card */
    <div
      ref={heightRef}
      className="relative flex min-h-[28rem] overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-card/50 dark:shadow-2xl dark:shadow-black/40"
      style={{ height: availableHeight != null ? `${availableHeight}px` : "calc(100dvh - 5rem)" }}
    >
      {/* Subtle radial glows behind the panel */}
      <div className="pointer-events-none absolute -right-32 -top-32 h-64 w-64 rounded-full bg-primary/6 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-48 w-48 rounded-full bg-primary/4 blur-3xl" />

      {/* Sidebar */}
      {showList && (
        <aside
          className={`relative flex flex-col border-r border-border/70 bg-background/50 backdrop-blur-md dark:border-white/8 dark:bg-background/40 ${
            isMobile ? "w-full" : "w-80 shrink-0 lg:w-96"
          }`}
        >
          {/* Sidebar header */}
          <div className="border-b border-border/70 p-3 dark:border-white/8">
            <div className="mb-2 flex items-center gap-2 px-1">
              <MessageCircleMore className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground/90">Messages</h2>
              {conversations.length > 0 && (
                <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-3xs font-semibold text-primary">
                  {conversations.length}
                </span>
              )}
            </div>
            <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>

          {/* overscroll-behavior left at its default (auto) on purpose: once
              this list has nothing left to scroll, the wheel/touch gesture
              should chain up to the page instead of dead-ending here. */}
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              conversations={conversations}
              filteredConversations={filteredConversations}
              activeChat={activeChat}
              isLoading={isLoadingConversations}
              searchQuery={searchQuery}
              formatTime={formatTime}
              getOtherUser={getOtherUser}
              setActiveChat={setActiveChat}
              getUnreadCount={getUnreadCount}
              currentUserId={currentUserId}
            />
          </div>
        </aside>
      )}

      {/* Main chat area */}
      {showChat ? (
        <section className="flex min-w-0 flex-1 flex-col bg-background/20 backdrop-blur-sm">
          <ChatHeader
            conversation={currentConversation}
            getOtherUser={getOtherUser}
            onBack={isMobile ? () => {
              setMobileView("list");
              setActiveChat("");
            } : undefined}
          />

          <div className="min-h-0 flex-1">
            <MessageList
              messages={messages}
              loading={isLoadingMessages}
              currentUserId={currentUserId}
              conversationId={activeChat}
              getSenderName={getSenderName}
              onReply={setReplyingTo}
              onEdit={setEditingMessage}
              onDelete={handleDeleteMessage}
            />
          </div>

          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoadingMessages}
            sending={isSending}
            conversationId={activeChat}
            userId={currentUserId}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => setEditingMessage(null)}
            onSaveEdit={handleEditMessage}
          />
        </section>
      ) : (
        !isMobile && (
          <div className="flex flex-1 flex-col items-center justify-center bg-background/10 p-6">
            <div className="max-w-xs text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20 shadow-lg shadow-primary/10">
                <Sparkles className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <h3 className="mb-2 text-base font-semibold">Your conversations</h3>
              <p className="text-sm text-muted-foreground/70">
                Pick a conversation on the left, or message a mentor directly from their profile.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ChatContainer;
