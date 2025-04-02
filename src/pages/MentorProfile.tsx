
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Linkedin, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Mentor } from "@/types/mentor";
import ChatModal from "@/components/chat/modals/ChatModal";
import { useAuth } from "@/context/AuthContext";

// Mock data for mentors
const mockMentors: Mentor[] = [
  {
    id: "1",
    name: "Jane Smith",
    department: "Computer Science",
    skills: ["JavaScript", "React", "Node.js"],
    rating: 4.8,
    profile_image: "https://ui-avatars.com/api/?name=Jane+Smith&background=6366F1&color=fff",
    linkedin_url: "https://linkedin.com/in/janesmith",
    bio: "Experienced web developer with 5 years of experience in frontend technologies.",
    review_count: 24,
    created_at: "2023-01-15T00:00:00Z"
  },
  {
    id: "2",
    name: "Mark Johnson",
    department: "Data Science",
    skills: ["Python", "Machine Learning", "Data Analysis"],
    rating: 4.9,
    profile_image: "https://ui-avatars.com/api/?name=Mark+Johnson&background=6366F1&color=fff",
    linkedin_url: "https://linkedin.com/in/markjohnson",
    bio: "Data scientist passionate about AI and machine learning applications.",
    review_count: 31,
    created_at: "2023-02-10T00:00:00Z"
  },
  {
    id: "3",
    name: "Sarah Williams",
    department: "UI/UX Design",
    skills: ["Figma", "Adobe XD", "UI Design", "UX Research"],
    rating: 4.7,
    profile_image: "https://ui-avatars.com/api/?name=Sarah+Williams&background=6366F1&color=fff",
    linkedin_url: "https://linkedin.com/in/sarahwilliams",
    bio: "Creative designer with a focus on user-centered design principles.",
    review_count: 19,
    created_at: "2023-03-05T00:00:00Z"
  }
];

const MentorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Simulate API fetch delay
    const fetchMentor = async () => {
      setLoading(true);
      try {
        // Find mentor in mock data
        setTimeout(() => {
          const foundMentor = mockMentors.find(m => m.id === id);
          
          if (foundMentor) {
            setMentor(foundMentor);
          } else {
            toast.error("Mentor not found");
          }
          setLoading(false);
        }, 500);
      } catch (err) {
        console.error("Error fetching mentor:", err);
        toast.error("An unexpected error occurred");
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
            <div className="mb-8">
              <Button variant="ghost" asChild className="px-0 text-muted-foreground">
                <Link to="/mentors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Mentors
                </Link>
              </Button>
            </div>
            
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
                  {isOwnProfile ? (
                    <Button 
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link to="/profile">
                        Edit Profile
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      onClick={openChatModal}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Connect with Mentor
                    </Button>
                  )}
                  
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
            
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-10">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-gray-700 leading-relaxed">
                {mentor.bio || "This mentor hasn't added a bio yet."}
              </p>
            </div>
          </div>
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
