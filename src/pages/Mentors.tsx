
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { getMentors, searchMentors } from "@/integrations/supabase/client";
import { Mentor } from "@/types/mentor";
import { useToast } from "@/components/ui/use-toast";

// Import refactored components
import MentorList from "@/components/mentors/MentorList";
import MentorsHeader from "@/components/mentors/MentorsHeader";
import MentorsFooter from "@/components/mentors/MentorsFooter";

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [isAiSearch, setIsAiSearch] = useState(false);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, [toast]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsAiSearch(false);
    
    if (!query) {
      // Fetch all mentors again when search is cleared
      const { data } = await getMentors();
      if (data) setFilteredMentors(data);
      return;
    }
    
    // Use Supabase search function
    const { data, error } = await searchMentors(query);
    
    if (error) {
      console.error("Error searching mentors:", error);
      return;
    }
    
    setFilteredMentors(data || []);
  };

  const handleGeminiSearch = (geminiResults: any[]) => {
    setIsAiSearch(true);
    
    if (!geminiResults || geminiResults.length === 0) {
      setFilteredMentors([]);
      return;
    }
    
    setFilteredMentors(geminiResults);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <MentorsHeader 
            title="Find Your Mentor" 
            description="Browse our extensive list of qualified mentors or use the search to find someone with the specific skills you need."
          />
          
          {/* Search */}
          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />
          
          {/* Mentors List */}
          <MentorList 
            isLoading={isLoading} 
            mentors={filteredMentors} 
            isAiSearch={isAiSearch} 
          />
        </div>
      </main>
      
      <MentorsFooter />
    </div>
  );
};

export default Mentors;
