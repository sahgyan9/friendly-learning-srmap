
import { motion } from "framer-motion";
import { Star, University, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Mentor } from "@/types/mentor";

interface MentorProfileHeaderProps {
  mentor: Mentor;
}

const MentorProfileHeader = ({ mentor }: MentorProfileHeaderProps) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <motion.div 
      className="flex flex-col md:flex-row gap-8 mb-10"
      variants={itemVariants}
    >
      <motion.div 
        className="flex-shrink-0"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="relative">
          <img 
            src={mentor.profile_image} 
            alt={mentor.name}
            className="w-36 h-36 md:w-48 md:h-48 rounded-xl object-cover shadow-lg"
            loading="lazy"
          />
          {/* Only show rating badge if mentor has reviews and rating > 0 */}
          {mentor.review_count > 0 && mentor.rating > 0 && (
            <motion.div 
              className="absolute -bottom-2 -right-2 flex items-center bg-background dark:bg-gray-800 rounded-full px-3 py-1 shadow-sm border border-border"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <Star className="w-4 h-4 text-amber-400 mr-1.5" />
              <span className="text-sm font-medium text-foreground">{mentor.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground ml-1">({mentor.review_count})</span>
            </motion.div>
          )}
          {/* Show "New Mentor" badge if no reviews or rating is 0 */}
          {(mentor.review_count === 0 || mentor.rating === 0) && (
            <motion.div 
              className="absolute -bottom-2 -right-2 bg-green-100 text-green-800 rounded-full px-3 py-1 shadow-sm border border-green-200"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
            >
              <span className="text-sm font-medium">New Mentor</span>
            </motion.div>
          )}
        </div>
      </motion.div>
      
      <div className="flex-1">
        <motion.h1 
          className="text-3xl font-bold mb-2"
          variants={itemVariants}
        >
          {mentor.name}
        </motion.h1>
        <motion.p 
          className="text-lg text-muted-foreground mb-4"
          variants={itemVariants}
        >
          {mentor.department}
        </motion.p>

        {/* University and Hobbies Section */}
        <motion.div 
          className="space-y-2 mb-6"
          variants={itemVariants}
        >
          {mentor.university && (
            <div className="flex items-center gap-2">
              <University className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{mentor.university}</span>
            </div>
          )}
          {mentor.hobbies && (
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{mentor.hobbies}</span>
            </div>
          )}
        </motion.div>
        
        <motion.div 
          className="flex flex-wrap gap-2 mb-6"
          variants={itemVariants}
        >
          {mentor.skills.map((skill, index) => (
            <Badge key={skill} variant="secondary" className="text-sm">
              {skill}
            </Badge>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default MentorProfileHeader;
