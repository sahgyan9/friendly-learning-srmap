import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Linkedin, MessageCircle, ArrowLeft, Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { Mentor, Ad } from "@/types/mentor";
import ChatModal from "@/components/chat/modals/ChatModal";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import CreateAdForm from "@/components/ads/CreateAdForm";
import AdCard from "@/components/ads/AdCard";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCreateAdOpen, setIsCreateAdOpen] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMentor = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const { data, error } = await getMentorById(id);

        if (error) {
          console.error("Error fetching mentor:", error);
          toast.error("Failed to load mentor profile");
          return;
        }

        if (data) {
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

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const { data, error } = await supabase
          .from("ads")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setAds(data || []);
      } catch (error) {
        console.error("Error fetching ads:", error);
      }
    };

    fetchAds();
  }, []);

  const openChatModal = () => {
    if (!user) {
      toast.error("Please sign in to connect with mentors");
      return;
    }

    setIsChatOpen(true);
  };

  const isOwnProfile = user && mentor && user.id === mentor.id;
  const isAdmin = user?.email === "sahgyan9@gmail.com";

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.5
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container px-4 md:px-6 pt-24 pb-16 flex justify-center items-center min-h-[60vh]">
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
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
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-3xl mx-auto text-center py-12">
            <h1 className="text-3xl font-bold mb-4">Mentor Not Found</h1>
            <p className="text-muted-foreground mb-8">
              The mentor profile you're looking for doesn't exist or has been removed.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button asChild>
                <Link to="/mentors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Mentors
                </Link>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container px-4 md:px-6 pt-24 pb-16">
        <motion.div
          className="max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Back Button */}
          <motion.div variants={itemVariants} className="mb-8">
            <Button asChild variant="ghost">
              <Link to="/mentors">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Mentors
              </Link>
            </Button>
          </motion.div>

          {/* Profile Header */}
          <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-8 mb-12">
            <div className="flex-shrink-0">
              <img
                src={mentor.profile_image}
                alt={mentor.name}
                className="w-32 h-32 rounded-full object-cover border-4 border-primary"
              />
            </div>
            <div className="flex-grow">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{mentor.name}</h1>
                  <p className="text-xl text-muted-foreground mb-4">{mentor.department}</p>
                </div>
                <div className="flex gap-4">
                  {isAdmin && isOwnProfile && (
                    <Dialog open={isCreateAdOpen} onOpenChange={setIsCreateAdOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Ad
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Ad</DialogTitle>
                        </DialogHeader>
                        <CreateAdForm
                          onSuccess={() => {
                            setIsCreateAdOpen(false);
                            // Refresh ads
                            window.location.reload();
                          }}
                          onCancel={() => setIsCreateAdOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  )}
                  {mentor.linkedin_url && (
                    <Button variant="outline" asChild>
                      <a
                        href={mentor.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <Linkedin className="mr-2 h-4 w-4" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  <Button onClick={openChatModal}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Connect
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400 mr-1" />
                  <span className="font-medium">{mentor.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground ml-1">
                    ({mentor.review_count} reviews)
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bio */}
          {mentor.bio && (
            <motion.div variants={itemVariants} className="mb-12">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-muted-foreground">{mentor.bio}</p>
            </motion.div>
          )}

          {/* Skills */}
          <motion.div variants={itemVariants} className="mb-12">
            <h2 className="text-xl font-semibold mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {mentor.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </motion.div>

          {/* Ads Section */}
          {isOwnProfile && ads.length > 0 && (
            <motion.div variants={itemVariants} className="mb-12">
              <h2 className="text-xl font-semibold mb-4">Your Ads</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ads.map((ad) => (
                  <AdCard key={ad.id} ad={ad} />
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        mentorId={mentor.id}
        mentorName={mentor.name}
      />
    </div>
  );
};

export default MentorProfile;
