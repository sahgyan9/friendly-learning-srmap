
import { Star, MessageCircle, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mentor } from "@/types/mentor";
import { Link } from "react-router-dom";

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard = ({ mentor }: MentorCardProps) => {
  const { id, name, department, skills, rating, profile_image } = mentor;

  // Render stars based on rating
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={`full-${i}`} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="h-5 w-5 text-yellow-400 fill-yellow-400/50" />
      );
    }
    
    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="h-5 w-5 text-yellow-400" />
      );
    }
    
    return stars;
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
          
          {/* Rating */}
          <div className="flex items-center mt-1 mb-4">
            {renderStars()}
            <span className="ml-1.5 text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
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
          asChild
        >
          <Link to={`/mentor/${id}`}>
            <MessageCircle className="h-4 w-4" />
            Connect
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default MentorCard;
