
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle } from "lucide-react";
import { getInitials } from "@/utils/user-utils";

interface MentorSuggestionCardProps {
  mentor: {
    id: string;
    name: string;
    department: string;
    skills: string[];
    rating: number;
    profile_image?: string;
    bio?: string;
  };
  onConnect: () => void;
}

const MentorSuggestionCard = ({ mentor, onConnect }: MentorSuggestionCardProps) => {
  return (
    <Card className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={mentor.profile_image} />
          <AvatarFallback>{getInitials(mentor.name)}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm truncate">{mentor.name}</h4>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-muted-foreground">{mentor.rating}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">{mentor.department}</p>
          
          <div className="flex flex-wrap gap-1 mb-2">
            {mentor.skills.slice(0, 2).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {mentor.skills.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{mentor.skills.length - 2}
              </Badge>
            )}
          </div>
          
          <Button 
            onClick={onConnect}
            size="sm" 
            className="w-full h-8 text-xs"
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            Connect
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MentorSuggestionCard;
