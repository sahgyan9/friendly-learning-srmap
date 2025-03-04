
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Mail, Linkedin, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { getMentorById } from "@/integrations/supabase/client";
import { Mentor } from "@/types/mentor";
import ChatModal from "@/components/ChatModal";

const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
    // Check if user is authenticated (can be added later with auth integration)
    setIsChatOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container px-4 md:px-6 pt-24 pb-16 flex justify-center items-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Loading mentor profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!mentor) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container px-4 md:px-6 pt-24 pb-16">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Back Navigation */}
            <div className="mb-8">
              <Button variant="ghost" asChild className="px-0 text-muted-foreground">
                <Link to="/mentors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Mentors
                </Link>
              </Button>
            </div>
            
            {/* Profile Header */}
            <div className="flex flex-col md:flex-row gap-8 mb-10">
              <div className="flex-shrink-0">
                <div className="relative">
                  <img 
                    src={mentor.profile_image} 
                    alt={mentor.name}
                    className="w-36 h-36 md:w-48 md:h-48 rounded-xl object-cover shadow-lg"
                  />
                  <div className="absolute -bottom-2 -right-2 flex items-center bg-white rounded-full px-3 py-1 shadow-sm border border-gray-100">
                    <Star className="w-4 h-4 text-yellow-400 mr-1.5" />
                    <span className="text-sm font-medium">{mentor.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground ml-1">({mentor.review_count})</span>
                  </div>
                </div>
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{mentor.name}</h1>
                <p className="text-lg text-muted-foreground mb-4">{mentor.department}</p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  {mentor.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                  <Button 
                    onClick={openChatModal}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Connect with Mentor
                  </Button>
                  
                  {mentor.linkedin_url && (
                    <Button variant="outline" asChild className="flex items-center gap-2">
                      <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn Profile
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {/* Bio Section */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-10">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed">
                {mentor.bio || "This mentor hasn't added a bio yet."}
              </p>
            </div>
            
            {/* Additional sections can be added here */}
          </div>
        </div>
      </main>
      
      {/* Chat Modal */}
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
