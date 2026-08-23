
import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, MessageCircle, Linkedin, Star, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getMentorById, isMentorListed } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { useNavigate } from "react-router-dom";
import { Mentor } from "@/types/mentor";
import { trackEvent } from "@/lib/posthog";

interface MentorProfileActionsProps {
  mentor: Mentor;
  canRate: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

const MentorProfileActions = ({ 
  mentor, 
  canRate, 
  ratingLoading, 
  onShowRatingModal 
}: MentorProfileActionsProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleConnect = async () => {
    if (!user) {
      toast.error("Please sign in to connect with mentors");
      return;
    }
    
    setIsConnecting(true);
    
    try {
      
      // Check if user is trying to message themselves
      if (mentor.id === user.id) {
        toast.error("You cannot message yourself");
        return;
      }
      
      // First verify the mentor exists and get fresh data
      const { data: mentorData, error: mentorError } = await getMentorById(mentor.id);
      
      if (mentorError || !mentorData) {
        console.error('Failed to fetch mentor data:', mentorError);
        toast.error("Failed to load mentor information");
        return;
      }
      
      
      // Create or get the conversation
      const { data: conversation, error: conversationError } = await getOrCreateConversation(user.id, mentor.id);
      
      if (conversationError || !conversation) {
        console.error('Failed to create/get conversation:', conversationError);
        toast.error("Failed to start conversation with mentor");
        return;
      }
      
      
      trackEvent("mentor_contacted", { mentor_id: mentor.id });

      // Show success message
      toast.success(`Connected with ${mentor.name}. Redirecting to messages...`);
      
      // Navigate to messages page with the conversation ID
      navigate(`/messages?chat=${conversation.id}`);
      
    } catch (err) {
      console.error('Error during connection process:', err);
      toast.error("An unexpected error occurred while connecting to the mentor");
    } finally {
      setIsConnecting(false);
    }
  };

  const isOwnProfile = user && mentor && user.id === mentor.id;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    // Stacked and full-width: these now live in a fixed-width sidebar card, so
    // a horizontal row would squeeze "Connect with Mentor" onto three lines.
    <motion.div className="flex flex-col gap-2" variants={itemVariants}>
      {isOwnProfile ? (
        <>
          {/* Bio, skills and interests are edited in place on this page. Photo,
              name and department still live on the account page, so this points
              at what the pencils cannot reach rather than at "editing" broadly. */}
          <Button asChild variant="outline" className="w-full gap-2">
            <Link to="/profile">
              <Camera className="h-4 w-4" />
              Change photo & details
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="outline" className="w-full gap-2">
              <Link to="/admin">
                <ShieldCheck className="h-4 w-4" />
                Admin Dashboard
              </Link>
            </Button>
          )}
        </>
      ) : (
        <>
          {/* The banner above the page carries the explanation, so the button
              only has to stop being clickable — repeating "taking a break" here
              would say it twice on one screen. */}
          <Button
            onClick={handleConnect}
            className="w-full gap-2"
            disabled={isConnecting || !isMentorListed(mentor)}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            {!isMentorListed(mentor)
              ? "Not accepting requests"
              : isConnecting
                ? "Connecting..."
                : "Connect with Mentor"}
          </Button>

          {canRate && !ratingLoading && (
            <Button variant="outline" onClick={onShowRatingModal} className="w-full gap-2">
              <Star className="h-4 w-4" />
              Rate Mentor
            </Button>
          )}
        </>
      )}

      {mentor.linkedin_url && (
        <Button variant="outline" asChild className="w-full gap-2">
          <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
            <Linkedin className="h-4 w-4" />
            LinkedIn Profile
          </a>
        </Button>
      )}
    </motion.div>
  );
};

export default MentorProfileActions;
