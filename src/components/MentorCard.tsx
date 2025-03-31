
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
  const { id, name, department, skills, rating, profile_image } = mentor;
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
            <Linkedin className="h-5 w-5 text-blue-600" />
          </div>
          
          {/* Simple Rating */}
          <div className="flex items-center mt-1 mb-4">
            <span className="text-sm font-medium text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-md">
              {rating.toFixed(1)} / 5.0
            </span>
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
