
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Loader2 } from "lucide-react";
import { getInitials } from "@/utils/user-utils";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { toast } from "sonner";

interface MentorSuggestionCardProps {
  mentor: {
    id: string;
    name: string;
    department: string;
    skills: string[];
    rating: number;
    profile_image?: string;
    bio?: string;
    relevanceScore?: number;
  };
  onConnect: () => void;
}

const MentorSuggestionCard = ({ mentor, onConnect }: MentorSuggestionCardProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Get the most relevant skills (first 3)
  const topSkills = mentor.skills.slice(0, 3);
  
  // Truncate bio for better display
  const truncatedBio = mentor.bio && mentor.bio.length > 80 
    ? mentor.bio.substring(0, 80) + "..." 
    : mentor.bio;

  const handleConnect = async () => {
    setIsConnecting(true);
    
    try {
      // Fetch mentor data first to ensure it's available
      console.log('Fetching mentor data before connecting:', mentor.id);
      const { data: mentorData, error } = await getMentorById(mentor.id);
      
      if (error || !mentorData) {
        console.error('Failed to fetch mentor data:', error);
        toast.error("Failed to load mentor information");
        return;
      }
      
      console.log('Mentor data fetched successfully:', mentorData.name);
      
      // Call the original onConnect function
      onConnect();
    } catch (err) {
      console.error('Error fetching mentor data:', err);
      toast.error("An error occurred while connecting to the mentor");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border-2 border-gray-100 dark:border-gray-700">
          <AvatarImage src={mentor.profile_image} alt={mentor.name} />
          <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            {getInitials(mentor.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate text-gray-900 dark:text-gray-100">
                {mentor.name}
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                {mentor.department}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-full">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {mentor.rating.toFixed(1)}
              </span>
            </div>
          </div>
          
          {/* Bio preview */}
          {truncatedBio && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
              {truncatedBio}
            </p>
          )}
          
          {/* Top skills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {topSkills.map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
              >
                {skill}
              </Badge>
            ))}
            {mentor.skills.length > 3 && (
              <Badge 
                variant="outline" 
                className="text-xs px-2 py-0.5 text-gray-500 dark:text-gray-400"
              >
                +{mentor.skills.length - 3} more
              </Badge>
            )}
          </div>
          
          <Button 
            onClick={handleConnect}
            size="sm" 
            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <MessageCircle className="h-3 w-3 mr-1" />
            )}
            Connect with {mentor.name.split(' ')[0]}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MentorSuggestionCard;
