
import { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Linkedin, Star, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { useNavigate } from "react-router-dom";
import { Mentor } from "@/types/mentor";

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
      console.log('Starting connection process with mentor:', mentor.id);
      
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
      
      console.log('Mentor data verified:', mentorData.name);
      
      // Create or get the conversation
      const { data: conversation, error: conversationError } = await getOrCreateConversation(user.id, mentor.id);
      
      if (conversationError || !conversation) {
        console.error('Failed to create/get conversation:', conversationError);
        toast.error("Failed to start conversation with mentor");
        return;
      }
      
      console.log('Conversation established:', conversation.id);
      
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
    <motion.div 
      className="flex flex-col sm:flex-row gap-3 mt-auto"
      variants={itemVariants}
    >
      {isOwnProfile ? (
        <>
          <Button 
            asChild
            className="flex items-center gap-2"
          >
            <Link to="/profile">
              Edit Profile
            </Link>
          </Button>
          {isAdmin && (
            <Button 
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                window.location.href = '/admin';
              }}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin Dashboard
            </Button>
          )}
        </>
      ) : (
        <>
          <Button 
            onClick={handleConnect}
            className="flex items-center gap-2"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            {isConnecting ? "Connecting..." : "Connect with Mentor"}
          </Button>
          
          {canRate && !ratingLoading && (
            <Button 
              variant="outline"
              onClick={onShowRatingModal}
              className="flex items-center gap-2"
            >
              <Star className="h-4 w-4" />
              Rate Mentor
            </Button>
          )}
        </>
      )}
      
      {mentor.linkedin_url && (
        <Button variant="outline" asChild className="flex items-center gap-2">
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
