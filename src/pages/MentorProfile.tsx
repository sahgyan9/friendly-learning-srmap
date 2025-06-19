
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import RatingModal from "@/components/rating/RatingModal";
import { useRating } from "@/hooks/useRating";
import MentorProfileContent from "@/components/mentor-profile/MentorProfileContent";

const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const { user } = useAuth();
  
  const { canRate, isLoading: ratingLoading, refreshRatingStatus } = useRating(id || "");

  useEffect(() => {
    const fetchMentor = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        console.log('Fetching mentor profile for ID:', id);
        const { data, error } = await getMentorById(id);
        
        if (error) {
          console.error("Error fetching mentor:", error);
          toast.error("Failed to load mentor profile");
          return;
        }
        
        if (data) {
          console.log('Mentor profile loaded:', data.name);
          setMentor(data);
        } else {
          toast.error("Mentor not found");
        }
      } catch (err) {
        console.error("Exception fetching mentor:", err);
        toast.error("An unexpected error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMentor();
  }, [id]);

  const handleRatingSubmitted = () => {
    refreshRatingStatus();
    // Refresh mentor data to get updated rating
    if (id) {
      getMentorById(id).then(({ data }) => {
        if (data) setMentor(data);
      });
    }
  };

  const isOwnProfile = user && mentor && user.id === mentor.id;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container px-4 md:px-6 pt-24 pb-16 flex justify-center items-center min-h-[60vh]">
          <motion.div 
            className="flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading mentor profile...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <motion.div 
          className="container px-4 md:px-6 pt-24 pb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-3xl mx-auto text-center py-12">
            <h1 className="text-3xl font-bold mb-4">Mentor Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The mentor profile you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/mentors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Mentors
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Button variant="ghost" asChild className="px-0 text-muted-foreground">
              <Link to="/mentors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Mentors
              </Link>
            </Button>
          </motion.div>
          
          <MentorProfileContent
            mentor={mentor}
            canRate={canRate}
            isOwnProfile={isOwnProfile}
            ratingLoading={ratingLoading}
            onShowRatingModal={() => setShowRatingModal(true)}
          />
        </div>
      </main>

      {/* Rating Modal */}
      <RatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        mentorId={mentor.id}
        mentorName={mentor.name}
        mentorImage={mentor.profile_image}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </div>
  );
};

export default MentorProfile;
