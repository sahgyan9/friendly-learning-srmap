
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "react-router-dom";
import MessagesLayout from "@/components/messages/MessagesLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const Messages = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
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
      
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${mentorId}),and(user1_id.eq.${mentorId},user2_id.eq.${user.id})`)
        .maybeSingle();

      if (!existingConversation) {
        // Create new conversation
        const { error } = await supabase
          .from('conversations')
          .insert({
            user1_id: user.id,
            user2_id: mentorId
          });

        if (error) {
          console.error('Error creating conversation:', error);
          toast.error('Failed to start conversation');
        } else {
          toast.success('Conversation started successfully');
        }
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsInitializingConversation(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background">
        {isInitializingConversation ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Starting conversation...</p>
            </div>
          </div>
        ) : (
          <MessagesLayout />
        )}
      </div>
    </>
  );
};

export default Messages;
