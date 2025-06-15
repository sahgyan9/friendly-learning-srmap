
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Linkedin, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { getMentorById } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import ChatModal from "@/components/chat/modals/ChatModal";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  const openChatModal = () => {
    if (!user) {
      toast.error("Please sign in to connect with mentors");
      return;
    }
    
    setIsChatOpen(true);
  };

  const isOwnProfile = user && mentor && user.id === mentor.id;

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
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <motion.div 
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div className="mb-8" variants={itemVariants}>
              <Button variant="ghost" asChild className="px-0 text-muted-foreground">
                <Link to="/mentors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Mentors
                </Link>
              </Button>
            </motion.div>
            
            <motion.div 
              className="flex flex-col md:flex-row gap-8 mb-10"
              variants={itemVariants}
            >
              <motion.div 
                className="flex-shrink-0"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative">
                  <motion.img 
                    src={mentor.profile_image} 
                    alt={mentor.name}
                    className="w-36 h-36 md:w-48 md:h-48 rounded-xl object-cover shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  />
                  {/* Only show rating badge if mentor has reviews and rating > 0 */}
                  {mentor.review_count > 0 && mentor.rating > 0 && (
                    <motion.div 
                      className="absolute -bottom-2 -right-2 flex items-center bg-white rounded-full px-3 py-1 shadow-sm border border-gray-100"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
                    >
                      <Star className="w-4 h-4 text-yellow-400 mr-1.5" />
                      <span className="text-sm font-medium">{mentor.rating.toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({mentor.review_count})</span>
                    </motion.div>
                  )}
                  {/* Show "New Mentor" badge if no reviews or rating is 0 */}
                  {(mentor.review_count === 0 || mentor.rating === 0) && (
                    <motion.div 
                      className="absolute -bottom-2 -right-2 bg-green-100 text-green-800 rounded-full px-3 py-1 shadow-sm border border-green-200"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3, duration: 0.4 }}
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
                
                <motion.div 
                  className="flex flex-wrap gap-2 mb-6"
                  variants={itemVariants}
                >
                  {mentor.skills.map((skill, index) => (
                    <motion.div
                      key={skill}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + (index * 0.05), duration: 0.3 }}
                    >
                      <Badge variant="secondary" className="text-sm">
                        {skill}
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>
                
                <motion.div 
                  className="flex flex-col sm:flex-row gap-3 mt-auto"
                  variants={itemVariants}
                >
                  {isOwnProfile ? (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        asChild
                        className="flex items-center gap-2"
                      >
                        <Link to="/profile">
                          Edit Profile
                        </Link>
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={openChatModal}
                        className="flex items-center gap-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Connect with Mentor
                      </Button>
                    </motion.div>
                  )}
                  
                  {mentor.linkedin_url && (
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" asChild className="flex items-center gap-2">
                        <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                          <Linkedin className="h-4 w-4" />
                          LinkedIn Profile
                        </a>
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-card p-6 rounded-lg shadow-sm border border-border mb-10"
              variants={itemVariants}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="text-xl font-semibold mb-4 text-foreground">About</h2>
              <p className="text-foreground leading-relaxed">
                {mentor.bio || "This mentor hasn't added a bio yet."}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </main>
      
      {isChatOpen && mentor && (
        <ChatModal 
          isOpen={isChatOpen} 
          onClose={() => setIsChatOpen(false)} 
          mentor={mentor}
        />
      )}
    </div>
  );
};

export default MentorProfile;
