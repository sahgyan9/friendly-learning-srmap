
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, MessageCircle, Linkedin, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import BadgeGrid from "@/components/badges/BadgeGrid";
import { useBadges } from "@/hooks/useBadges";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

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

  const handleConnect = () => {
    if (!user) {
      toast.error("Please sign in to connect with mentors");
      return;
    }
    
    setIsConnecting(true);
    // Add a small delay to show loading state
    setTimeout(() => {
      navigate(`/messages?mentor=${mentor.id}`);
    }, 100);
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
          <div className="flex flex-col items-center space-y-3 mb-4">
            <Avatar className="h-16 w-16 ring-2 ring-blue-100 dark:ring-blue-900">
              <AvatarImage 
                src={mentor.profile_image} 
                alt={mentor.name}
                loading="lazy"
              />
              <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                {getInitials(mentor.name)}
              </AvatarFallback>
            </Avatar>
            
            {/* Rating or New Mentor Badge - moved below picture */}
            {mentor.review_count === 0 || mentor.rating === 0 ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                New Mentor
              </Badge>
            ) : (
              <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {mentor.rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({mentor.review_count})
                </span>
              </div>
            )}
            
            {/* Name and department with more space */}
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {mentor.name}
              </h3>
              <div className="flex items-center justify-center space-x-2">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4 text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
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

          {/* Bio section */}
          <div className="mb-4 flex-grow">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 text-center">
              {mentor.bio}
            </p>
          </div>

          {/* Skills section */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1 justify-center">
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
                className="text-xs px-3 py-1 h-7"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnect();
                }}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <MessageCircle className="h-3 w-3 mr-1" />
                )}
                Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorCard;
