
import { MessageCircle, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mentor } from "@/types/mentor";
import { Link } from "react-router-dom";
import { useState } from "react";
import ChatModal from "@/components/chat/modals/ChatModal";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard = ({ mentor }: MentorCardProps) => {
  const { id, name, department, skills, rating, profile_image, linkedin_url } = mentor;
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();

  const handleConnectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Please sign in to connect with mentors");
      return;
    }
    
    setIsChatOpen(true);
  };

  const handleLinkedInClick = (e: React.MouseEvent) => {
    if (!linkedin_url) {
      e.preventDefault();
      toast.error("LinkedIn profile not available for this mentor");
      return;
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start gap-4">
        {/* Profile Image */}
        <img
          src={profile_image}
          alt={name}
          className="w-16 h-16 rounded-full object-cover border border-gray-100"
        />
        
        <div className="flex-1">
          {/* Name and LinkedIn */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
              <p className="text-sm text-gray-500">{department}</p>
            </div>
            {linkedin_url ? (
              <a 
                href={linkedin_url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleLinkedInClick}
                className="hover:text-blue-700 transition-colors"
                aria-label={`${name}'s LinkedIn profile`}
              >
                <Linkedin className="h-5 w-5 text-blue-600" />
              </a>
            ) : (
              <Linkedin className="h-5 w-5 text-blue-600 opacity-50" />
            )}
          </div>
          
          {/* Rating - Simplified to match screenshot */}
          <div className="flex items-center mt-1 mb-4">
            <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 text-amber-400 fill-amber-400"
                viewBox="0 0 24 24"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Skills */}
      <div className="mt-4 mb-5">
        <p className="text-sm font-medium mb-2">Skills:</p>
        <div className="flex flex-wrap gap-2">
          {skills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="font-normal text-sm py-0.5"
            >
              {skill}
            </Badge>
          ))}
          {skills.length > 3 && (
            <Badge
              variant="outline"
              className="font-normal text-sm py-0.5"
            >
              +{skills.length - 3} more
            </Badge>
          )}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mt-4">
        <Button 
          variant="outline" 
          className="flex-1"
          asChild
        >
          <Link to={`/mentor/${id}`}>
            View Profile
          </Link>
        </Button>
        <Button 
          variant="default" 
          className="flex-1 flex items-center justify-center gap-2"
          onClick={handleConnectClick}
        >
          <MessageCircle className="h-4 w-4" />
          Connect
        </Button>
      </div>

      {/* Chat Modal */}
      {isChatOpen && (
        <ChatModal 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          mentor={mentor}
        />
      )}
    </div>
  );
};

export default MentorCard;
