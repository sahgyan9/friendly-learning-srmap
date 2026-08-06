
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import MessagesLayout from "@/components/messages/MessagesLayout";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const Messages = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const mentorId = searchParams.get('mentorId');
  const [isInitializingConversation, setIsInitializingConversation] = useState(false);

  useEffect(() => {
    if (mentorId && user) {
      initializeConversation();
    }
  }, [mentorId, user]);

  const initializeConversation = async () => {
    if (!mentorId || !user) return;

    try {
      setIsInitializingConversation(true);
      const { data: conversation, error } = await getOrCreateConversation(user.id, mentorId);
      if (error) {
        console.error('Error creating/getting conversation:', error);
        toast.error('Failed to start conversation');
      } else {
        toast.success('Conversation ready!');
      }
      setSearchParams({});
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsInitializingConversation(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <MessageSquare className="h-8 w-8 text-primary" />
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
    <div className="flex min-h-screen flex-col bg-background pt-[var(--navbar-height,4rem)]">
      {isInitializingConversation ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground text-sm">Starting conversation…</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8">
          <MessagesLayout />
        </div>
      )}
    </div>
  );
};

export default Messages;
