
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, MessageCircle, Linkedin, Loader2, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import BadgeGrid from "@/components/badges/BadgeGrid";
import { useBadges } from "@/hooks/useBadges";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard = ({ mentor }: MentorCardProps) => {
  const { getUserBadges } = useBadges();
  const userBadges = getUserBadges(mentor.id);
  const { user } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

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
      toast.error("An error occurred while connecting to the mentor");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCardClick = async () => {
    setIsNavigating(true);
    // Add a small delay to show loading state
    setTimeout(() => {
      navigate(`/mentor/${mentor.id}`);
    }, 100);
  };

  return (
    <div className="relative group">
      <Card 
        className="group hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col hover:scale-[1.01] cursor-pointer"
        onClick={handleCardClick}
      >
        {isNavigating && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        
        <CardContent className="p-6 flex flex-col h-full">
          {/* Header section with avatar and basic info */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <Avatar className="h-16 w-16 ring-2 ring-blue-100 dark:ring-blue-900 mb-2">
                <AvatarImage 
                  src={mentor.profile_image} 
                  alt={mentor.name}
                  loading="lazy"
                />
                <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                  {getInitials(mentor.name)}
                </AvatarFallback>
              </Avatar>
              
              {/* Rating or New Mentor Badge - moved below avatar */}
              {mentor.review_count === 0 || mentor.rating === 0 ? (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                  New Mentor
                </Badge>
              ) : (
                <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 text-yellow-500 fill-current" />
                  <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {mentor.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({mentor.review_count})
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {mentor.name}
                </h3>

                {/* The whole point of the alumni transition: a student scanning
                    this list can tell who has already been through placements.
                    Company beats cohort year when we have it — "at Google" is
                    what makes someone worth asking. */}
                {mentor.is_alumni && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="gap-1 bg-indigo-100 text-indigo-800 text-xs dark:bg-indigo-950 dark:text-indigo-200"
                    >
                      <GraduationCap className="h-3 w-3" />
                      Alumni
                      {mentor.graduation_year ? ` '${String(mentor.graduation_year).slice(-2)}` : ""}
                    </Badge>
                    {(mentor.company || mentor.job_title) && (
                      <span className="truncate text-xs text-gray-600 dark:text-gray-400">
                        {[mentor.job_title, mentor.company].filter(Boolean).join(" at ")}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {mentor.department}
                    </span>
                  </div>
                  {/* LinkedIn icon */}
                  {mentor.linkedin_url && (
                    <a
                      href={mentor.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bio section */}
          <div className="mb-4 flex-grow">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {mentor.bio}
            </p>
          </div>

          {/* Skills section */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {mentor.skills.slice(0, 3).map((skill, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                >
                  {skill}
                </Badge>
              ))}
              {mentor.skills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{mentor.skills.length - 3} more
                </Badge>
              )}
            </div>
          </div>

          {/* Badges section */}
          {userBadges.length > 0 && (
            <div className="mb-4">
              <BadgeGrid badges={userBadges} maxDisplay={3} />
            </div>
          )}

          {/* Footer section - pushed to bottom */}
          <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                <Users className="h-4 w-4" />
                <span>
                  {mentor.review_count === 0 ? "No reviews yet" : `${mentor.review_count} reviews`}
                </span>
              </div>
              
              <Button 
                size="sm" 
                className="text-sm px-4 py-2 h-9"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnect();
                }}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorCard;
