
import { motion } from "framer-motion";
import MentorProfileHeader from "./MentorProfileHeader";
import MentorProfileActions from "./MentorProfileActions";
import MentorProfileSections from "./MentorProfileSections";
import { Mentor } from "@/types/mentor";

interface MentorProfileContentProps {
  mentor: Mentor;
  canRate: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

const MentorProfileContent = ({ 
  mentor, 
  canRate, 
  isOwnProfile, 
  ratingLoading, 
  onShowRatingModal 
}: MentorProfileContentProps) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

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
      className="max-w-4xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <MentorProfileHeader mentor={mentor} />
      
      <motion.div className="mb-6" variants={itemVariants}>
        <MentorProfileActions 
          mentor={mentor}
          canRate={canRate}
          ratingLoading={ratingLoading}
          onShowRatingModal={onShowRatingModal}
        />
      </motion.div>

      <MentorProfileSections 
        mentor={mentor}
        canRate={canRate}
        isOwnProfile={isOwnProfile}
        ratingLoading={ratingLoading}
        onShowRatingModal={onShowRatingModal}
      />
    </motion.div>
  );
};

export default MentorProfileContent;
