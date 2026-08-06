import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import MentorSuggestionCard from "./MentorSuggestionCard";

/** One matched lecturer, as ai-chatbot returns them alongside the mentors. */
interface FacultySuggestion {
  id: string;
  name: string;
  department: string | null;
  slug: string | null;
  image_url: string | null;
  interests: string[];
  path: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  mentorSuggestions?: any[];
  facultySuggestions?: FacultySuggestion[];
  timestamp: Date;
}

interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatbotModal = ({ isOpen, onClose }: ChatbotModalProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load conversation history when modal opens
  useEffect(() => {
    if (isOpen && user) {
      loadConversationHistory();
    } else if (isOpen && !user) {
      // For non-authenticated users, generate a session ID
      setSessionId(crypto.randomUUID());
    }
  }, [isOpen, user]);

  const loadConversationHistory = async () => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(20); // Load last 20 messages

      if (error) {
        console.error('Error loading conversation history:', error);
        return;
      }

      if (data && data.length > 0) {
        // Group messages by session and convert to UI format
        const conversationMessages: Message[] = [];

        data.forEach((conv) => {
          if (conv.message_type === 'user') {
            conversationMessages.push({
              id: conv.id,
              type: 'user',
              content: conv.message,
              timestamp: new Date(conv.created_at || Date.now())
            });
          } else if (conv.message_type === 'ai') {
            // Safely handle suggested_mentors which could be null or different types
            let mentorSuggestions: any[] = [];
            if (conv.suggested_mentors && Array.isArray(conv.suggested_mentors)) {
              mentorSuggestions = conv.suggested_mentors;
            }

            conversationMessages.push({
              id: conv.id,
              type: 'ai',
              content: conv.response,
              mentorSuggestions: mentorSuggestions,
              timestamp: new Date(conv.created_at || Date.now())
            });
          }
        });

        setMessages(conversationMessages);

        // Use the latest session ID if available
        if (data.length > 0 && data[data.length - 1].session_id) {
          setSessionId(data[data.length - 1].session_id);
        } else {
          setSessionId(crypto.randomUUID());
        }
      } else {
        setSessionId(crypto.randomUUID());
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      setSessionId(crypto.randomUUID());
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chatbot', {
        body: {
          message: inputValue,
          sessionId: sessionId,
          userId: user?.id || null
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.aiResponse,
        mentorSuggestions: data.suggestedMentors || [],
        // The function has returned these on every reply since it moved to
        // retrieval, and nothing read them — four matched lecturers were
        // computed and thrown away per message. They are the half of the answer
        // a mentor cannot give.
        facultySuggestions: data.suggestedFaculty || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Update session ID if returned
      if (data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMentorConnect = (mentor: any) => {
    onClose();
    navigate(`/messages?mentor=${mentor.id}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            AI Assistant
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {isLoadingHistory && (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Loading conversation history...</p>
              </div>
            )}

            {messages.length === 0 && !isLoadingHistory && (
              <motion.div
                className="text-center py-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Bot className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Hello! I'm your AI assistant</h3>
                <p className="text-muted-foreground mb-4">
                  Ask me anything! I can help with general questions and suggest mentors for specific problems.
                </p>

                {/* Suggested prompts */}
                <div className="mt-6 space-y-2 max-w-md mx-auto">
                  <p className="text-sm font-medium text-left mb-3">Try asking:</p>
                  <button
                    onClick={() => setInputValue("I need help with Data Structures")}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm"
                  >
                    💡 "I need help with Data Structures"
                  </button>
                  <button
                    onClick={() => setInputValue("Find me a mentor for web development")}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm"
                  >
                    🎯 "Find me a mentor for web development"
                  </button>
                  <button
                    onClick={() => setInputValue("I want to learn machine learning")}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-sm"
                  >
                    🚀 "I want to learn machine learning"
                  </button>
                </div>
              </motion.div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                  <div
                    className={`rounded-lg px-4 py-2 ${message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      }`}
                  >
                    {message.content}
                  </div>

                  {/* Mentor Suggestions */}
                  {message.mentorSuggestions && message.mentorSuggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Here are some mentors who might help:
                      </p>
                      {message.mentorSuggestions.map((mentor) => (
                        <MentorSuggestionCard
                          key={mentor.id}
                          mentor={mentor}
                          onConnect={() => handleMentorConnect(mentor)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Lecturers. Kept visually lighter than the mentor cards:
                      a senior can be messaged from here, a professor cannot, so
                      these link to the profile instead of implying a chat. No
                      rating is shown — the assistant is not ranking staff. */}
                  {message.facultySuggestions && message.facultySuggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Lecturers whose research lines up:
                      </p>
                      <div className="space-y-1.5">
                        {message.facultySuggestions.map((faculty) => (
                          <button
                            key={faculty.id}
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(faculty.path);
                            }}
                            className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card p-2.5 text-left transition-colors hover:border-primary/40"
                          >
                            {faculty.image_url ? (
                              <img
                                src={faculty.image_url}
                                alt=""
                                loading="lazy"
                                className="h-9 w-9 shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                {faculty.name.slice(0, 2)}
                              </span>
                            )}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {faculty.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {faculty.interests.length > 0
                                  ? faculty.interests.slice(0, 3).join(" · ")
                                  : faculty.department ?? "Faculty"}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatbotModal;
