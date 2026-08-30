
import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams, useNavigate, useParams } from "react-router-dom";
import { MessageCircleMore } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import MessagesLayout from "@/components/messages/MessagesLayout";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const Messages = () => {
  const { user } = useAuth();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const chatId = searchParams.get('chat');
  const mentorId = searchParams.get('mentor') || searchParams.get('mentorId');
  const [isInitializingConversation, setIsInitializingConversation] = useState(false);
  const processedMentorRef = useRef<string | null>(null);

  // If ?chat=xxx is passed, redirect immediately to canonical /messages/:conversationId
  useEffect(() => {
    if (chatId) {
      navigate(`/messages/${chatId}`, { replace: true });
    }
  }, [chatId, navigate]);

  // If ?mentor=xxx is passed, resolve or create conversation and redirect to /messages/:conversationId
  useEffect(() => {
    if (mentorId && user && processedMentorRef.current !== mentorId) {
      processedMentorRef.current = mentorId;
      initializeConversation(mentorId);
    }
  }, [mentorId, user]);

  const initializeConversation = async (targetMentorId: string) => {
    if (!user) return;

    if (targetMentorId === user.id) {
      toast.error("You cannot message yourself");
      navigate("/messages", { replace: true });
      return;
    }

    try {
      setIsInitializingConversation(true);
      const { data: conversation, error } = await getOrCreateConversation(user.id, targetMentorId);
      if (error || !conversation) {
        console.error('Error creating/getting conversation:', error);
        toast.error('Failed to start conversation');
        navigate('/messages', { replace: true });
      } else {
        toast.success('Conversation ready!');
        navigate(`/messages/${conversation.id}`, { replace: true });
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast.error('Failed to start conversation');
      navigate('/messages', { replace: true });
    } finally {
      setIsInitializingConversation(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <MessageCircleMore className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
          <p className="mt-2 text-muted-foreground">Sign in to view your conversations.</p>
          <Button asChild className="mt-6">
            <Link to="/signin">Sign in</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background pt-[var(--navbar-height,4rem)]">
      {isInitializingConversation ? (
        <div className="container mx-auto flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground text-sm">Starting conversation…</p>
          </div>
        </div>
      ) : (
        <div className="container mx-auto flex flex-1 flex-col p-0 sm:px-4 sm:py-4 lg:px-6">
          <MessagesLayout />
        </div>
      )}
    </div>
  );
};

export default Messages;
