
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import RatingModal from "@/components/rating/RatingModal";
import { useRating } from "@/hooks/useRating";
import MentorProfileContent from "@/components/mentor-profile/MentorProfileContent";
import { getMentorSchema, getBreadcrumbSchema } from "@/lib/structured-data";

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

  // Generate SEO metadata and structured data
  const generateSEO = () => {
    if (!mentor) return null;

    const mentorName = mentor.name || "Mentor";
    const mentorDescription = mentor.bio || `${mentorName} is a mentor on Project FL.`;
    const mentorSkills = mentor.skills ? mentor.skills.join(", ") : "";
    const metaTitle = `${mentorName} - Project FL Mentor | ${mentor.department || 'University Mentor'}`;
    const metaDescription = `Connect with ${mentorName}, a verified mentor at Project FL. ${mentorDescription.substring(0, 120)}${mentorDescription.length > 120 ? '...' : ''}`;

    return (
      <>
        <SEOHead
          title={metaTitle}
          description={metaDescription}
          keywords={`${mentorName}, Project FL mentor, university student mentor, ${mentorSkills}, academic mentor, peer learning`}
          canonical={`https://www.project-fl.me/mentor/${mentor.id}`}
          ogTitle={`Meet ${mentorName} - Project FL Mentor`}
          ogDescription={metaDescription}
          ogImage={mentor.profile_image || "/og-image.png"}
        />

        <StructuredData data={getMentorSchema(mentor)} />
        <StructuredData data={getBreadcrumbSchema([
          { name: "Home", url: "https://www.project-fl.me/" },
          { name: "Mentors", url: "https://www.project-fl.me/mentors" },
          { name: mentorName, url: `https://www.project-fl.me/mentor/${mentor.id}` }
        ])} />
      </>
    );
  };

  return (
    <div className="min-h-screen">
      {mentor && generateSEO()}
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
