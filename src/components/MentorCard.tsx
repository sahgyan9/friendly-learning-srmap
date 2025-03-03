
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mentor } from "@/data/mentors";
import { Link } from "react-router-dom";

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard = ({ mentor }: MentorCardProps) => {
  const { id, name, department, skills, rating, profileImage } = mentor;

  return (
    <div className="glass-card rounded-xl p-6 transition-all duration-300 hover:shadow-xl animate-scale-in">
      {/* Profile Image and Rating */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative mb-4">
          <img
            src={profileImage}
            alt={name}
            className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-md"
          />
          <div className="absolute -bottom-2 -right-2 flex items-center bg-white rounded-full px-2 py-0.5 shadow-sm border border-gray-100">
            <Star className="w-3.5 h-3.5 text-yellow-400 mr-1" />
            <span className="text-sm font-medium">{rating.toFixed(1)}</span>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold mb-1 text-gray-900">{name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{department}</p>
      </div>
      
      {/* Skills */}
      <div className="mb-5">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {skills.slice(0, 3).map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="font-normal text-xs"
            >
              {skill}
            </Badge>
          ))}
          {skills.length > 3 && (
            <Badge
              variant="outline"
              className="font-normal text-xs"
            >
              +{skills.length - 3} more
            </Badge>
          )}
        </div>
      </div>
      
      {/* Connect Button */}
      <Button 
        variant="default" 
        className="w-full"
        asChild
      >
        <Link to={`/mentors/${id}`}>
          View Profile
        </Link>
      </Button>
    </div>
  );
};

export default MentorCard;
