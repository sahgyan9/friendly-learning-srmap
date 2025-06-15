
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import BadgeGrid from "@/components/badges/BadgeGrid";
import { useBadges } from "@/hooks/useBadges";

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard = ({ mentor }: MentorCardProps) => {
  const { getUserBadges } = useBadges();
  const userBadges = getUserBadges(mentor.id);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4">
          <Avatar className="h-16 w-16 ring-2 ring-blue-100 dark:ring-blue-900">
            <AvatarImage src={mentor.profile_image} alt={mentor.name} />
            <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
              {getInitials(mentor.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {mentor.name}
                </h3>
                <div className="flex items-center space-x-1 mt-1">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {mentor.department}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded-full">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {mentor.rating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({mentor.review_count})
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
              {mentor.bio}
            </p>

            <div className="mt-4">
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

            {userBadges.length > 0 && (
              <div className="mt-4">
                <BadgeGrid badges={userBadges} maxDisplay={3} />
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{mentor.review_count} reviews</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/mentor/${mentor.id}`}>
                    View Profile
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/mentor/${mentor.id}`}>
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Connect
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MentorCard;
