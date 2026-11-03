import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Send,
  Bot,
  User,
  Loader2,
  HelpCircle,
  Wallet,
  UserCheck,
  GraduationCap,
  Users,
  Award,
  ShieldCheck,
  Rocket,
  SquarePen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import MentorSuggestionCard, { type MentorSuggestion } from "./MentorSuggestionCard";
import CertificatePreview from "@/components/certificate/CertificatePreview";
import { BecomeMentorLinkPreview } from "@/components/common/BecomeMentorLinkPreview";
import { isEmojiOnly, getEmojiCount, getEmojiFontSizeClass } from "@/utils/emoji-utils";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "Platform",
    questions: [
      {
        id: "about-platform",
        icon: HelpCircle,
        question: "What is Friendly Learning and how does it work?",
      },
      {
        id: "free-access",
        icon: Wallet,
        question: "Is Friendly Learning free to use for SRM AP students?",
      },
    ],
  },
  {
    label: "Mentors and faculty",
    questions: [
      {
        id: "find-mentor",
        icon: UserCheck,
        question: "Find me a mentor for web development or DSA",
      },
      {
        id: "find-faculty",
        icon: GraduationCap,
        question: "How do I find faculty for research projects?",
      },
      {
        id: "mentor-vs-faculty",
        icon: Users,
        question: "What's the difference between a Mentor and Faculty?",
      },
    ],
  },
  {
    label: "Certificates",
    questions: [
      {
        id: "mentor-certificate",
        icon: Award,
        question: "Why become a mentor & how do I earn a certificate?",
      },
      {
        id: "verify-certificate",
        icon: ShieldCheck,
        question: "How do I verify a mentor certificate?",
      },
    ],
  },
  {
    label: "Opportunities",
    questions: [
      {
        id: "opportunities",
        icon: Rocket,
        question: "Where can I find hackathons, internships, or events?",
      },
    ],
  },
];

// Flat list used for the post-conversation suggestion chips (show 4 most useful)
const SUGGESTED_CHIPS = [
  { id: "find-mentor", label: "Find a mentor", icon: UserCheck, question: "Find me a mentor for web development or DSA" },
  { id: "find-faculty", label: "Find faculty", icon: GraduationCap, question: "How do I find faculty for research projects?" },
  { id: "mentor-certificate", label: "Mentor certificate", icon: Award, question: "Why become a mentor & how do I earn a certificate?" },
  { id: "opportunities", label: "Opportunities", icon: Rocket, question: "Where can I find hackathons, internships, or events?" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FacultySuggestion {
  id: string;
  name: string;
  department: string | null;
  slug: string | null;
  image_url: string | null;
  interests: string[];
  path: string;
}

/**
 * Optional — the `ai-chatbot` function has no `suggestedStudents` field yet.
 * Plain students also have no public profile route the way mentors do
 * (`/mentor/:id`), so unlike `FacultySuggestion` there is deliberately no
 * `path` here: the card renders name + interests only, never a link.
 */
interface StudentSuggestion {
  id: string;
  name: string;
  image_url: string | null;
  interests: string[];
}

type RichContent = "certificate-preview" | "mentor-benefits";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  mentorSuggestions?: MentorSuggestion[];
  facultySuggestions?: FacultySuggestion[];
  studentSuggestions?: StudentSuggestion[];
  richContent?: RichContent | null;
  timestamp: Date;
}

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ChatbotModal = ({ isOpen, onClose }: ChatbotModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();

  const hasMessages = messages.length > 0;

  // Load conversation history when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadConversationHistory();
    } else if (isOpen && !user) {
      setSessionId(crypto.randomUUID());
    }
  }, [isOpen, user]);

  const isInitialLoadRef = useRef(true);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);

  // Reset initial load flag when modal opens
  useEffect(() => {
    if (isOpen) {
      isInitialLoadRef.current = true;
    }
  }, [isOpen]);

  // Scroll to user's question when sending/receiving, or to bottom on initial history load
  useEffect(() => {
    if (!hasMessages) return;

    if (isInitialLoadRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      isInitialLoadRef.current = false;
    } else if (lastUserMsgRef.current) {
      lastUserMsgRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages, hasMessages]);

  const loadConversationHistory = async () => {
    if (!user) return;
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(20);

      if (error) { console.error("Error loading conversation history:", error); return; }

      if (data && data.length > 0) {
        const conversationMessages: Message[] = [];
        data.forEach((conv) => {
          if (conv.message_type === "user") {
            conversationMessages.push({
              id: conv.id, type: "user", content: conv.message,
              timestamp: new Date(conv.created_at || Date.now()),
            });
          } else if (conv.message_type === "ai") {
            let mentorSuggestions: MentorSuggestion[] = [];
            if (conv.suggested_mentors && Array.isArray(conv.suggested_mentors)) {
              mentorSuggestions = conv.suggested_mentors as unknown as MentorSuggestion[];
            }
            conversationMessages.push({
              id: conv.id, type: "ai", content: conv.response, mentorSuggestions,
              timestamp: new Date(conv.created_at || Date.now()),
            });
          }
        });
        setMessages(conversationMessages);
        if (data[data.length - 1].session_id) {
          setSessionId(data[data.length - 1].session_id);
        } else {
          setSessionId(crypto.randomUUID());
        }
      } else {
        setSessionId(crypto.randomUUID());
      }
    } catch (error) {
      console.error("Error loading conversation history:", error);
      setSessionId(crypto.randomUUID());
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSelectQuestion = (questionText: string) => {
    setInputValue(questionText);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleNewConversation = () => {
    setMessages([]);
    setInputValue("");
    setSessionId(crypto.randomUUID());
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(), type: "user", content: inputValue, timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-chatbot", {
        body: { message: inputValue, sessionId, userId: user?.id || null, path: location.pathname },
      });
      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(), type: "ai",
        content: data.aiResponse,
        mentorSuggestions: data.suggestedMentors || [],
        facultySuggestions: data.suggestedFaculty || [],
        // Absent on any deployed function that predates this field — `|| []`
        // keeps that "no students" rather than a crash.
        studentSuggestions: data.suggestedStudents || [],
        richContent: data.richContent ?? null,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: "ai", content: "I'm sorry, I encountered an error. Please try again.", timestamp: new Date() },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleMentorConnect = (mentor: MentorSuggestion) => {
    onClose();
    navigate(`/messages?mentor=${mentor.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] h-[80vh] flex flex-col p-0 overflow-hidden gap-0">

        {/* ── Header ── */}
        <DialogHeader className="flex-none flex-row items-center justify-between space-y-0 border-b border-border py-4 pl-5 pr-12">
          <DialogTitle className="flex items-center gap-2.5 text-sm font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
              <Bot className="h-4 w-4" />
            </div>
            Assistant
          </DialogTitle>
          {hasMessages && (
            <Button
              onClick={handleNewConversation}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <SquarePen className="h-3.5 w-3.5" />
              New chat
            </Button>
          )}
        </DialogHeader>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Welcome screen — only when no messages */}
          {!hasMessages && !isLoadingHistory && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-5 py-6"
            >
              {/* Greeting */}
              <div className="mb-5 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                  <Bot className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Ask about Friendly Learning</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a question to fill the input, or type your own.
                </p>
              </div>

              {/* Grouped question list */}
              <div className="space-y-4">
                {CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    {/* Category header */}
                    <h4 className="mb-2 text-xs font-medium text-muted-foreground">{cat.label}</h4>

                    {/* Question rows */}
                    <div className="space-y-1">
                      {cat.questions.map((q) => {
                        const Icon = q.icon;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleSelectQuestion(q.question)}
                            className="flex min-h-[40px] w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="flex-1 text-sm text-foreground">
                              {q.question}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading history */}
          {isLoadingHistory && (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading conversation…</p>
            </div>
          )}

          {/* Conversation messages */}
          {hasMessages && (
            <div className="flex flex-col gap-4 px-5 py-4">
              {(() => {
                const lastUserMsgIndex = messages.reduce((acc, m, idx) => (m.type === "user" ? idx : acc), -1);
                return messages.map((message, index) => {
                  const isEmoji = message.type === "user" && isEmojiOnly(message.content);
                  const emojiCount = isEmoji ? getEmojiCount(message.content) : 0;

                  return (
                    <motion.div
                      key={message.id}
                      ref={index === lastUserMsgIndex ? lastUserMsgRef : null}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.type === "ai" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div className={`max-w-[78%] space-y-2 ${message.type === "user" ? "order-2" : ""}`}>
                        <div
                          className={
                            isEmoji
                              ? `p-1 bg-transparent border-none shadow-none ${getEmojiFontSizeClass(emojiCount)}`
                              : `rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                                  message.type === "user"
                                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                                    : "rounded-tl-sm bg-muted text-foreground"
                                }`
                          }
                        >
                          {message.type === "ai" ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                              <ReactMarkdown>{message.content}</ReactMarkdown>
                            </div>
                          ) : (
                            message.content
                          )}
                        </div>

                    {/* Rich content blocks */}
                    {message.richContent === "mentor-benefits" && (
                      <div className="space-y-2">
                        <CertificatePreview name={profile?.name ?? ""} defaultOpen={true} />
                        <BecomeMentorLinkPreview />
                      </div>
                    )}
                    {message.richContent === "certificate-preview" && (
                      <CertificatePreview name={profile?.name ?? ""} defaultOpen={true} />
                    )}

                    {/* Mentor cards */}
                    {message.mentorSuggestions && message.mentorSuggestions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Mentors who might help</p>
                        {message.mentorSuggestions.map((mentor) => (
                          <MentorSuggestionCard key={mentor.id} mentor={mentor} onConnect={() => handleMentorConnect(mentor)} />
                        ))}
                      </div>
                    )}

                    {/* Faculty cards */}
                    {message.facultySuggestions && message.facultySuggestions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Faculty with related research</p>
                        {message.facultySuggestions.map((faculty) => (
                          <button
                            key={faculty.id}
                            type="button"
                            onClick={() => { onClose(); navigate(faculty.path); }}
                            className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-colors duration-150 hover:border-foreground/20 hover:bg-accent"
                          >
                            {faculty.image_url ? (
                              <img src={faculty.image_url} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                {faculty.name.slice(0, 2)}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{faculty.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {faculty.interests.length > 0 ? faculty.interests.slice(0, 3).join(" · ") : faculty.department ?? "Faculty"}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Student cards — no navigation, no public profile route
                        for a plain student to link to. */}
                    {message.studentSuggestions && message.studentSuggestions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Students with the same interests</p>
                        {message.studentSuggestions.map((student) => (
                          <div
                            key={student.id}
                            className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-2.5"
                          >
                            {student.image_url ? (
                              <img src={student.image_url} alt="" loading="lazy" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                {student.name.slice(0, 2)}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">{student.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {student.interests.length > 0 ? student.interests.slice(0, 3).join(" · ") : "Student"}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.type === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              );
            });
          })()}

              {/* AI typing indicator */}
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  {/* Typing dots run only while a reply is pending */}
                  <div className="flex items-center gap-1 rounded-xl rounded-tl-sm bg-muted px-4 py-3" role="status" aria-label="Assistant is replying">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Input footer ── */}
        <div className="flex-none border-t border-border px-4 pb-4 pt-3">

          {/* Suggestion chips — only shown once conversation has started */}
          <AnimatePresence>
            {hasMessages && (
              <motion.div
                key="chips"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-2 flex flex-wrap gap-1.5"
              >
                {SUGGESTED_CHIPS.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => handleSelectQuestion(chip.question)}
                      disabled={isLoading}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-foreground/20 hover:bg-accent hover:text-foreground disabled:opacity-40"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {chip.label}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Text input */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question"
              aria-label="Message"
              disabled={isLoading}
              className="flex-1 text-sm"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatbotModal;
