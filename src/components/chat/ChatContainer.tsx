
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, Message } from "@/types/chat";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import SearchInput from "./SearchInput";
import { MessagesSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Measures actual space left below the element, in px, instead of guessing it.
 *
 * This used to be a hard-coded `calc(100dvh-9rem)` that assumed the site
 * header's height. SiteHeader mounts once above <Routes> and stays alive
 * across navigations, so its collapsible second row can already be collapsed
 * (or the "Connecting with mentor…" line can be showing) by the time this
 * page appears — the guess and the real header height then disagree. With
 * `overflow-hidden` on this panel and `overscroll-contain` on the scrollers
 * inside it, that mismatch is what read as scrolling getting "stuck": the
 * panel was sized for a header that wasn't the one actually there, and nested
 * scroll had nowhere to hand the gesture off to.
 */
function useAvailableHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const recalc = () => {
      const top = el.getBoundingClientRect().top;
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      setHeight(Math.max(viewportHeight - top, 0));
    };

    recalc();

    // Catches header height changes (nav row collapsing, the mentor-connect
    // line appearing) since they resize the document body around this panel.
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
  // `window.innerWidth` was previously read straight from render with no
  // resize listener, so the layout was decided once and never revisited —
  // rotating a phone or dragging a window edge left the wrong pane showing.
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const { ref: heightRef, height: availableHeight } = useAvailableHeight<HTMLDivElement>();

  const currentConversation = conversations.find((c) => c.id === activeChat);

  // Opening a conversation on a phone should move you into it.
  useEffect(() => {
    if (activeChat && isMobile) setMobileView("chat");
  }, [activeChat, isMobile]);

  const showList = !isMobile || mobileView === "list";
  const showChat = !isMobile ? Boolean(activeChat) : mobileView === "chat" && Boolean(activeChat);

  /**
   * Name lookup by id.
   *
   * This used to be three nested scans of every message and every conversation
   * per call, and it is called once per rendered message — so a long thread was
   * quadratic. Built once per data change instead.
   */
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
    // Height is measured at runtime (see useAvailableHeight) rather than
    // assumed, so it stays correct whether the site header's second row is
    // expanded or collapsed. The calc is only a pre-measurement fallback for
    // the first paint.
    <div
      ref={heightRef}
      className="flex min-h-[28rem] overflow-hidden rounded-xl border bg-card shadow-sm"
      style={{ height: availableHeight != null ? `${availableHeight}px` : "calc(100dvh - 9rem)" }}
    >
      {showList && (
        <aside
          className={`flex flex-col border-r bg-background ${
            isMobile ? "w-full" : "w-80 shrink-0 lg:w-96"
          }`}
        >
          <div className="border-b p-3">
            <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain">
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
              currentUserId={currentUserId}
            />
          </div>
        </aside>
      )}

      {showChat ? (
        <section className="flex min-w-0 flex-1 flex-col bg-background">
          <ChatHeader
            conversation={currentConversation}
            getOtherUser={getOtherUser}
            onBack={isMobile ? () => setMobileView("list") : undefined}
          />

          <div className="min-h-0 flex-1">
            <MessageList
              messages={messages}
              loading={isLoadingMessages}
              currentUserId={currentUserId}
              conversationId={activeChat}
              getSenderName={getSenderName}
            />
          </div>

          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoadingMessages}
            sending={isSending}
            conversationId={activeChat}
            userId={currentUserId}
          />
        </section>
      ) : (
        !isMobile && (
          <div className="flex flex-1 items-center justify-center bg-muted/20 p-6">
            <div className="max-w-xs text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <MessagesSquare className="h-7 w-7 text-primary" aria-hidden />
              </div>
              <h3 className="mb-1 font-semibold">Your messages</h3>
              <p className="text-sm text-muted-foreground">
                Pick a conversation on the left, or message a mentor from their profile.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ChatContainer;
