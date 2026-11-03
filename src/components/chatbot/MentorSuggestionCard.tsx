
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle } from "lucide-react";
import { getInitials } from "@/utils/user-utils";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { toast } from "sonner";

export interface MentorSuggestion {
  id: string;
  name: string;
  department: string;
  skills: string[];
  rating: number;
  profile_image?: string;
  bio?: string;
  relevanceScore?: number;
}

interface MentorSuggestionCardProps {
  mentor: MentorSuggestion;
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
      const { data: mentorData, error } = await getMentorById(mentor.id);
      
      if (error || !mentorData) {
        console.error('Failed to fetch mentor data:', error);
        toast.error("Could not load this mentor. Try again.");
        return;
      }
      
      
      // Call the original onConnect function
      onConnect();
    } catch (err) {
      console.error('Error fetching mentor data:', err);
      toast.error("Could not open a conversation with this mentor. Try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 border border-border">
          <AvatarImage src={mentor.profile_image} alt={mentor.name} />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {getInitials(mentor.name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate text-foreground">
                {mentor.name}
              </h4>
              <p className="truncate text-sm text-muted-foreground">
                {mentor.department}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              <span className="tabular text-sm font-medium text-foreground">
                {mentor.rating.toFixed(1)}
              </span>
            </div>
          </div>
          
          {/* Bio preview */}
          {truncatedBio && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              {truncatedBio}
            </p>
          )}
          
          {/* Top skills */}
          <div className="flex flex-wrap gap-1 mb-3">
            {topSkills.map((skill) => (
              <Badge 
                key={skill} 
                variant="secondary" 
                className="rounded px-1.5 py-0.5 text-xs font-normal"
              >
                {skill}
              </Badge>
            ))}
            {mentor.skills.length > 3 && (
              <Badge 
                variant="outline" 
                className="tabular rounded px-1.5 py-0.5 text-xs font-normal text-muted-foreground"
              >
                +{mentor.skills.length - 3} more
              </Badge>
            )}
          </div>
          
          <Button 
            onClick={handleConnect}
            size="sm" 
            className="w-full"
            isLoading={isConnecting}
          >
            {!isConnecting && <MessageCircle aria-hidden />}
            Message {mentor.name.split(' ')[0]}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MentorSuggestionCard;
