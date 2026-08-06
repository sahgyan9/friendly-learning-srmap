
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

  // Redirect unauthenticated users to sign in instead of showing a bare alert.
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero header */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />
          <div className="container mx-auto max-w-3xl px-4 pb-8 pt-28">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <MessageSquare className="h-3.5 w-3.5" />
                Messages
              </div>
              <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
              <p className="mt-2 text-base text-muted-foreground">Sign in to view and send messages.</p>
            </motion.div>
          </div>
        </div>
        <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="mb-4 text-muted-foreground">You need to be signed in to view your messages.</p>
          <Button asChild>
            <Link to="/signin">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero header — primary brand colour matching Mentors */}
      <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />
        <div className="container mx-auto max-w-3xl px-4 pb-6 pt-28">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <MessageSquare className="h-3.5 w-3.5" />
              Messages
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
            <p className="mt-1.5 text-base text-muted-foreground">Your conversations with mentors and students.</p>
          </motion.div>
        </div>
      </div>

      {isInitializingConversation ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Starting conversation...</p>
          </div>
        </div>
      ) : (
        // Every other page frames its content in this same container — the
        // chat panel was rendering full-bleed with no side margins, which
        // read as unfinished next to Groups, Events and Posts.
        <div className="container mx-auto max-w-6xl px-4 py-6">
          <MessagesLayout />
        </div>
      )}
    </div>
  );
};

export default Messages;
