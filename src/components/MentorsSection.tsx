
import { useState, useEffect } from "react";
import SearchBar from "@/components/SearchBar";
import MentorCard from "@/components/MentorCard";
import { Mentor } from "@/types/mentor";
import { getMentors, searchMentors } from "@/integrations/supabase/services/mentors";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const MentorsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch mentors from Supabase on component mount
  useEffect(() => {
    const fetchMentors = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getMentors();
        
        if (error) {
          console.error("Error fetching mentors:", error);
          toast({
            title: "Error",
            description: "Failed to load mentors.",
            variant: "destructive",
          });
          setFilteredMentors([]);
          return;
        }
        
        if (data && data.length > 0) {
          setFilteredMentors(data);
        } else {
          setFilteredMentors([]);
          toast({
            title: "No mentors found",
            description: "There are currently no mentors available.",
          });
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        setFilteredMentors([]);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, [toast]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query) {
      // Fetch all mentors again when search is cleared
      const { data } = await getMentors();
      if (data) setFilteredMentors(data);
      return;
    }
    
    // Use the searchMentors function from Supabase services
    const { data, error } = await searchMentors(query);
    
    if (error) {
      console.error("Error searching mentors:", error);
      toast({
        title: "Search Error",
        description: "Failed to search mentors. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setFilteredMentors(data || []);
  };

  const handleGeminiSearch = (geminiResults: any[]) => {
    const mappedMentors = geminiResults.map(dbMentor => {
      return {
        id: dbMentor.id,
        name: dbMentor.name,
        department: dbMentor.department,
        skills: dbMentor.skills,
        rating: dbMentor.rating,
        profile_image: dbMentor.profile_image,
        linkedin_url: dbMentor.linkedin_url,
        bio: dbMentor.bio,
        review_count: dbMentor.review_count,
        created_at: dbMentor.created_at
      } as Mentor;
    });
    
    setFilteredMentors(mappedMentors);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Find Your Mentor</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Search from our pool of experienced senior students who are ready 
            to help you excel in your academic journey.
          </p>
        </div>
        
        <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-lg">Loading mentors...</span>
          </div>
        ) : filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMentors.map((mentor) => (
              <MentorCard key={mentor.id} mentor={mentor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">No mentors found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or browse all available mentors.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MentorsSection;
