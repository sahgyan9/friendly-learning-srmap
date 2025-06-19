
import { motion } from "framer-motion";
import BadgeDisplay from "@/components/badges/BadgeDisplay";
import ReviewsList from "@/components/rating/ReviewsList";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";

interface MentorProfileSectionsProps {
  mentor: Mentor;
  canRate: boolean;
  isOwnProfile: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

const MentorProfileSections = ({ 
  mentor, 
  canRate, 
  isOwnProfile, 
  ratingLoading, 
  onShowRatingModal 
}: MentorProfileSectionsProps) => {
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  return (
    <>
      {/* Badges Section */}
      <motion.div 
        className="mb-10"
        variants={itemVariants}
      >
        <h2 className="text-2xl font-semibold mb-4">Badges</h2>
        <BadgeDisplay userId={mentor.id} />
      </motion.div>

      {/* Reviews Section */}
      <motion.div 
        className="mb-10"
        variants={itemVariants}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Reviews</h2>
          {canRate && !isOwnProfile && !ratingLoading && (
            <Button onClick={onShowRatingModal}>
              Add Review
            </Button>
          )}
        </div>
        <ReviewsList mentorId={mentor.id} />
      </motion.div>
    </>
  );
};

export default MentorProfileSections;
