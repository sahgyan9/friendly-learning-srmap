
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";

export const useMentorConnection = (userId: string, setActiveChat: (id: string) => void) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isProcessingMentor, setIsProcessingMentor] = useState(false);
  const mentorProcessedRef = useRef<string | null>(null);

  useEffect(() => {
    const mentorId = searchParams.get('mentor');
    
    // Skip if no mentor ID, no user, or already processing this mentor
    if (!mentorId || !userId || isProcessingMentor || mentorProcessedRef.current === mentorId) {
      return;
    }

    const handleMentorConnection = async () => {
      setIsProcessingMentor(true);
      mentorProcessedRef.current = mentorId;
      
      try {
        
        // First verify the mentor exists
        const { data: mentor, error: mentorError } = await getMentorById(mentorId);
        
        if (mentorError || !mentor) {
          console.error('Mentor not found:', mentorError);
          toast.error("Mentor not found or is no longer available");
          // Clear the mentor parameter from URL
          setSearchParams(params => {
            params.delete('mentor');
            return params;
          });
          return;
        }
        
        // Check if user is trying to message themselves
        if (mentor.id === userId) {
          toast.error("You cannot message yourself");
          // Clear the mentor parameter from URL
          setSearchParams(params => {
            params.delete('mentor');
            return params;
          });
          return;
        }
        
        
        // Get or create conversation with the mentor
        const { data: conversation, error: conversationError } = await getOrCreateConversation(userId, mentorId);
        
        if (conversationError || !conversation) {
          console.error('Failed to create/get conversation:', conversationError);
          toast.error("Failed to start conversation with mentor");
          return;
        }
        
        
        // Set the active chat to this conversation
        setActiveChat(conversation.id);
        
        // Show success message
        toast.success(`Connected with ${mentor.name}. You can now start messaging!`);
        
        // Clear the mentor parameter from URL after successful connection
        setSearchParams(params => {
          params.delete('mentor');
          return params;
        });
        
      } catch (err) {
        console.error('Exception during mentor connection:', err);
        toast.error("An unexpected error occurred while connecting to the mentor");
      } finally {
        setIsProcessingMentor(false);
      }
    };
    
    handleMentorConnection();
  }, [searchParams, userId, isProcessingMentor, setSearchParams, setActiveChat]);

  return { isProcessingMentor };
};
