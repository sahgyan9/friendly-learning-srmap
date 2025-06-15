
import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import ChatModal from "@/components/chat/modals/ChatModal";
import BadgeCard from "@/components/badges/BadgeCard";
import { useBadges } from "@/hooks/useBadges";
import type { Mentor } from "@/types/mentor";

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard = ({ mentor }: MentorCardProps) => {
  const { user } = useAuth();
  const [showChatModal, setShowChatModal] = useState(false);
  const { userBadges, badgeTypes } = useBadges(mentor.id);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleConnectClick = () => {
    if (!user) {
      window.location.href = "/signin";
      return;
    }
    setShowChatModal(true);
  };

  // Get top 3 badges to display
  const topBadges = userBadges.slice(0, 3);
  const badgeTypesMap = new Map(badgeTypes.map(bt => [bt.id, bt]));

  return (
    <>
      <Card className="h-full hover:shadow-lg transition-shadow duration-300 overflow-hidden group">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Profile Image */}
            <Avatar className="w-20 h-20 border-4 border-gray-100 dark:border-gray-700">
              <AvatarImage src={mentor.profile_image} alt={mentor.name} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-lg font-semibold">
                {getInitials(mentor.name)}
              </AvatarFallback>
            </Avatar>

            {/* Name and Department */}
            <div className="space-y-1">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {mentor.name}
              </h3>
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                {mentor.department}
              </p>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {mentor.rating.toFixed(1)}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                ({mentor.review_count} reviews)
              </span>
            </div>

            {/* Bio */}
            {mentor.bio && (
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 leading-relaxed">
                {mentor.bio}
              </p>
            )}

            {/* Skills */}
            <div className="flex flex-wrap gap-1 justify-center max-w-full">
              {mentor.skills.slice(0, 4).map((skill, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
                >
                  {skill}
                </Badge>
              ))}
              {mentor.skills.length > 4 && (
                <Badge variant="outline" className="text-xs text-gray-500 dark:text-gray-400">
                  +{mentor.skills.length - 4} more
                </Badge>
              )}
            </div>

            {/* Badges */}
            {topBadges.length > 0 && (
              <div className="flex gap-2 justify-center">
                {topBadges.map((userBadge) => {
                  const badgeType = badgeTypesMap.get(userBadge.badge_type_id);
                  if (!badgeType) return null;
                  
                  return (
                    <BadgeCard
                      key={userBadge.id}
                      badge={badgeType}
                      awarded={true}
                      awardedDate={userBadge.awarded_at}
                      size="sm"
                      showDescription={true}
                    />
                  );
                })}
                {userBadges.length > 3 && (
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400">
                    +{userBadges.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                asChild
              >
                <Link to={`/mentor/${mentor.id}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Profile
                </Link>
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={handleConnectClick}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Connect
              </Button>
            </div>

            {/* LinkedIn Link */}
            {mentor.linkedin_url && (
              <a
                href={mentor.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                LinkedIn Profile
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chat Modal */}
      {showChatModal && (
        <ChatModal
          mentor={{ id: mentor.id, name: mentor.name }}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </>
  );
};

export default MentorCard;
