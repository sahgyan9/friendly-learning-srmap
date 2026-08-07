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
  Sparkles,
  UserCheck,
  GraduationCap,
  Users,
  Award,
  ShieldCheck,
  Rocket,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import MentorSuggestionCard from "./MentorSuggestionCard";
import CertificatePreview from "@/components/certificate/CertificatePreview";
import { BecomeMentorLinkPreview } from "@/components/common/BecomeMentorLinkPreview";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    label: "Platform",
    accentClass: "bg-blue-500",
    questions: [
      {
        id: "about-platform",
        icon: HelpCircle,
        question: "What is Friendly Learning and how does it work?",
        iconClass: "text-blue-500",
      },
      {
        id: "free-access",
        icon: Sparkles,
        question: "Is Friendly Learning free to use for SRM AP students?",
        iconClass: "text-blue-500",
      },
    ],
  },
  {
    label: "Mentors & Faculty",
    accentClass: "bg-emerald-500",
    questions: [
      {
        id: "find-mentor",
        icon: UserCheck,
        question: "Find me a mentor for web development or DSA",
        iconClass: "text-emerald-500",
      },
      {
        id: "find-faculty",
        icon: GraduationCap,
        question: "How do I find faculty for research projects?",
        iconClass: "text-emerald-500",
      },
      {
        id: "mentor-vs-faculty",
        icon: Users,
        question: "What's the difference between a Mentor and Faculty?",
        iconClass: "text-emerald-500",
      },
    ],
  },
  {
    label: "Certificates",
    accentClass: "bg-violet-500",
    questions: [
      {
        id: "mentor-certificate",
        icon: Award,
        question: "Why become a mentor & how do I earn a certificate?",
        iconClass: "text-violet-500",
      },
      {
        id: "verify-certificate",
        icon: ShieldCheck,
        question: "How do I verify a mentor certificate?",
        iconClass: "text-violet-500",
      },
    ],
  },
  {
    label: "Opportunities",
    accentClass: "bg-amber-500",
    questions: [
      {
        id: "opportunities",
        icon: Rocket,
        question: "Where can I find hackathons, internships, or events?",
        iconClass: "text-amber-500",
      },
    ],
  },
];

// Flat list used for the post-conversation suggestion chips (show 4 most useful)
const SUGGESTED_CHIPS = [
  { id: "find-mentor", label: "Find Mentor", icon: UserCheck, question: "Find me a mentor for web development or DSA" },
  { id: "find-faculty", label: "Find Faculty", icon: GraduationCap, question: "How do I find faculty for research projects?" },
  { id: "mentor-certificate", label: "Earn Certificate", icon: Award, question: "Why become a mentor & how do I earn a certificate?" },
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

type RichContent = "certificate-preview" | "mentor-benefits";

interface Message {
  id: string;
  type: "user" | "ai";
  content: string;
  mentorSuggestions?: any[];
  facultySuggestions?: FacultySuggestion[];
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

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (hasMessages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
            let mentorSuggestions: any[] = [];
            if (conv.suggested_mentors && Array.isArray(conv.suggested_mentors)) {
              mentorSuggestions = conv.suggested_mentors;
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

  const handleMentorConnect = (mentor: any) => {
    onClose();
    navigate(`/messages?mentor=${mentor.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[580px] h-[80vh] flex flex-col p-0 overflow-hidden gap-0">

        {/* ── Header ── */}
        <DialogHeader className="flex-none px-5 py-4 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2.5 text-sm font-semibold">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Bot className="h-4 w-4" />
            </div>
            AI Assistant
          </DialogTitle>
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
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">How can I help?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a question to fill the input, then send — or type your own.
                </p>
              </div>

              {/* Grouped question list */}
              <div className="space-y-4">
                {CATEGORIES.map((cat) => (
                  <div key={cat.label}>
                    {/* Category header */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${cat.accentClass}`} />
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {cat.label}
                      </span>
                    </div>

                    {/* Question rows */}
                    <div className="space-y-1">
                      {cat.questions.map((q) => {
                        const Icon = q.icon;
                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => handleSelectQuestion(q.question)}
                            className="group flex w-full items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-left transition-all duration-150 hover:border-blue-500/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20"
                          >
                            <Icon className={`h-3.5 w-3.5 shrink-0 ${q.iconClass} opacity-70 group-hover:opacity-100`} />
                            <span className="flex-1 text-[13px] text-foreground/80 group-hover:text-foreground">
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
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <p className="text-xs text-muted-foreground">Loading conversation…</p>
            </div>
          )}

          {/* Conversation messages */}
          {hasMessages && (
            <div className="flex flex-col gap-4 px-5 py-4">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2.5 ${message.type === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.type === "ai" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div className={`max-w-[78%] space-y-2 ${message.type === "user" ? "order-2" : ""}`}>
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        message.type === "user"
                          ? "rounded-tr-sm bg-blue-600 text-white"
                          : "rounded-tl-sm bg-muted text-foreground"
                      }`}
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
                        <p className="text-xs text-muted-foreground">Mentors who might help:</p>
                        {message.mentorSuggestions.map((mentor) => (
                          <MentorSuggestionCard key={mentor.id} mentor={mentor} onConnect={() => handleMentorConnect(mentor)} />
                        ))}
                      </div>
                    )}

                    {/* Faculty cards */}
                    {message.facultySuggestions && message.facultySuggestions.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">Lecturers whose research lines up:</p>
                        {message.facultySuggestions.map((faculty) => (
                          <button
                            key={faculty.id}
                            type="button"
                            onClick={() => { onClose(); navigate(faculty.path); }}
                            className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/40"
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
                  </div>

                  {message.type === "user" && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* AI typing indicator */}
              {isLoading && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
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
        <div className="flex-none border-t border-border/60 px-4 pb-4 pt-3">

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
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-blue-400/60 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                    >
                      <Icon className="h-3 w-3" />
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
              placeholder="Ask me anything…"
              disabled={isLoading}
              className="flex-1 rounded-full border-border/70 bg-muted/40 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-blue-500/30"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatbotModal;
