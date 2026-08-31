import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Conversation, Message } from "@/types/chat";
import ConversationList from "./ConversationList";
import MessageList from "./MessageList";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import SearchInput from "./SearchInput";
import { MessageCircleMore, Sparkles, SquarePen } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { NewConversationModal } from "./NewConversationModal";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatViewportState {
  height: number | null;
  isKeyboardOpen: boolean;
  viewportHeight: number;
}

/**
 * Robust viewport manager for desktop and mobile devices (especially iOS Safari).
 *
 * Root Cause & iOS Fix:
 * On iOS Safari / WebKit, when an input field is focused inside a standard scrolling
 * document, WebKit natively invokes its internal `scrollIntoView` algorithm to pull
 * the input above the virtual keyboard. This causes `window.scrollY` to jump upwards,
 * pushing the page header and chat header off-screen. Additionally, layout viewport
 * coordinates become negative relative to the visual viewport, causing height calculations
 * to misplace the input near the top of the screen with a massive empty void underneath.
 *
 * This hook fixes the issue permanently:
 * 1. On mobile in active chat mode, the container locks directly to `window.visualViewport.height`.
 * 2. On visualViewport resize, scroll, and input focus, it instantly enforces `window.scrollTo(0, 0)`.
 * 3. It tracks `isKeyboardOpen` so `MessageInput` can dynamically adjust bottom padding.
 * 4. On desktop, it computes the available height below the site header cleanly.
 */
function useChatViewport(isMobile: boolean, isChatActive: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [viewportState, setViewportState] = useState<ChatViewportState>({
    height: null,
    isKeyboardOpen: false,
    viewportHeight: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const updateViewport = () => {
      const viewport = window.visualViewport;
      const currentViewportHeight = viewport?.height ?? window.innerHeight;
      const screenHeight = window.innerHeight;
      const keyboardOpen = isMobile && currentViewportHeight < screenHeight - 100;

      if (isMobile) {
        // Prevent layout viewport displacement on iOS / mobile browsers
        if (window.scrollY !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
        }

        setViewportState({
          height: currentViewportHeight,
          isKeyboardOpen: keyboardOpen,
          viewportHeight: currentViewportHeight,
        });
      } else {
        const rectTop = el.getBoundingClientRect().top;
        const visualTop = viewport ? rectTop - viewport.offsetTop : rectTop;
        const top = Math.max(visualTop, 0);
        const bottomPadding = 16;
        const computed = Math.max(currentViewportHeight - top - bottomPadding, 380);

        setViewportState({
          height: computed,
          isKeyboardOpen: false,
          viewportHeight: currentViewportHeight,
        });
      }
    };

    updateViewport();

    const resizeObserver = new ResizeObserver(updateViewport);
    resizeObserver.observe(document.body);

    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);

    // Prevent background page bounce while chatting on mobile
    const { documentElement: html, body } = document;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyHeight = body.style.height;

    if (isMobile && isChatActive) {
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      body.style.height = "100%";
      window.scrollTo(0, 0);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.height = prevBodyHeight;
    };
  }, [isMobile, isChatActive]);

  return { ref, ...viewportState };
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
  handleReaction?: (messageId: string, emoji: string) => Promise<any>;
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
  handleReaction,
}: ChatContainerProps) => {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [campusSearchInitialQuery, setCampusSearchInitialQuery] = useState("");

  const showChat = !isMobile ? Boolean(activeChat) : mobileView === "chat" && Boolean(activeChat);
  const showList = !isMobile || mobileView === "list";

  const { ref: heightRef, height: availableHeight, isKeyboardOpen } = useChatViewport(
    isMobile,
    Boolean(activeChat && mobileView === "chat"),
  );

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

  // get_conversation_messages doesn't return sender.profile_image, so the
  // avatar for received messages has to come from the conversation record
  // (already loaded for the header) rather than from the message itself.
  const avatarsById = useMemo(() => {
    const avatars = new Map<string, string>();

    const record = (id?: string, image?: string | null) => {
      if (!id || !image) return;
      if (avatars.has(id)) return;
      avatars.set(id, image);
    };

    for (const conversation of conversations) {
      record(conversation.user1_id, conversation.user1?.profile_image);
      record(conversation.user2_id, conversation.user2?.profile_image);
    }
    for (const message of messages) {
      record(message.sender_id, message.sender?.profile_image);
    }

    return avatars;
  }, [conversations, messages]);

  const getSenderName = useCallback(
    (senderId: string) => {
      if (senderId === currentUserId) return "You";
      return namesById.get(senderId) ?? "User";
    },
    [namesById, currentUserId],
  );

  const getSenderAvatar = useCallback(
    (senderId: string) => avatarsById.get(senderId),
    [avatarsById],
  );

  const handleStartDirectChat = async (targetUserId: string, targetUserName?: string) => {
    if (!currentUserId) {
      toast.error("Please sign in to start a message thread");
      return;
    }
    try {
      const { data: conv, error } = await getOrCreateConversation(currentUserId, targetUserId);
      if (error || !conv) {
        throw error || new Error("Failed to initialize conversation");
      }
      if (targetUserName) {
        toast.success(`Connected with ${targetUserName}`);
      }
      setActiveChat(conv.id);
      if (isMobile) {
        setMobileView("chat");
      }
    } catch (err) {
      console.error("Error starting chat:", err);
      toast.error("Could not start conversation. Please try again.");
    }
  };

  return (
    /* Glassmorphic card on desktop, full-viewport fluid on mobile */
    <div
      ref={heightRef}
      className={cn(
        "relative flex overflow-hidden transition-all duration-150",
        isMobile && showChat
          ? "fixed inset-0 z-[60] h-full w-full rounded-none border-0 bg-background"
          : "min-h-[28rem] rounded-2xl border border-border/80 bg-card/90 shadow-xl shadow-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-card/50 dark:shadow-2xl dark:shadow-black/40",
      )}
      style={{
        height: availableHeight != null ? `${availableHeight}px` : isMobile ? "100dvh" : "calc(100dvh - 5rem)",
      }}
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
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <MessageCircleMore className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground/90">Messages</h2>
                {conversations.length > 0 && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-3xs font-semibold text-primary">
                    {conversations.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setCampusSearchInitialQuery("");
                  setIsNewChatModalOpen(true);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                title="New Message"
                aria-label="New Message"
              >
                <SquarePen className="h-4 w-4" />
              </button>
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
              onOpenCampusSearch={(query) => {
                setCampusSearchInitialQuery(query || "");
                setIsNewChatModalOpen(true);
              }}
              onStartDirectChat={handleStartDirectChat}
            />
          </div>
        </aside>
      )}

      {/* New conversation modal */}
      <NewConversationModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        currentUserId={currentUserId}
        initialQuery={campusSearchInitialQuery}
        onConversationCreated={(convId) => {
          setActiveChat(convId);
          if (isMobile) {
            setMobileView("chat");
          }
        }}
      />

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
              getSenderAvatar={getSenderAvatar}
              onReply={setReplyingTo}
              onEdit={setEditingMessage}
              onDelete={handleDeleteMessage}
              onReaction={handleReaction}
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
            isKeyboardOpen={isKeyboardOpen}
            isMobile={isMobile}
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
