
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSearchParams } from "react-router-dom";
import MessagesLayout from "@/components/messages/MessagesLayout";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat/conversation.service";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      
      // Use the proper conversation service to prevent duplicates
      const { data: conversation, error } = await getOrCreateConversation(user.id, mentorId);

      if (error) {
        console.error('Error creating/getting conversation:', error);
        toast.error('Failed to start conversation');
      } else {
        toast.success('Conversation ready!');
      }

      // Clear the mentorId from URL after initialization
      setSearchParams({});
    } catch (error) {
      console.error('Error initializing conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setIsInitializingConversation(false);
    }
  };

  return (
    <>
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
