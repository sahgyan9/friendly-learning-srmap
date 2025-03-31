import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { mentors as localMentors } from "@/data/mentors";
import { supabase, getMentors } from "@/integrations/supabase/client";
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
            description: "Failed to load mentors. Using local data instead.",
            variant: "destructive",
          });
          setFilteredMentors(convertLocalMentorsFormat(localMentors));
          return;
        }
        
        if (data && data.length > 0) {
          setFilteredMentors(data);
        } else {
          // If no data in Supabase, use local data
          setFilteredMentors(convertLocalMentorsFormat(localMentors));
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        setFilteredMentors(convertLocalMentorsFormat(localMentors));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, [toast]);

  // Convert local mentor format to match Supabase format
  const convertLocalMentorsFormat = (localData: any[]): Mentor[] => {
    return localData.map(mentor => ({
      id: mentor.id,
      name: mentor.name,
      department: mentor.department,
      skills: mentor.skills,
      rating: mentor.rating,
      profile_image: mentor.profileImage,
      linkedin_url: mentor.linkedinUrl,
      bio: mentor.bio,
      review_count: mentor.reviewCount,
      created_at: new Date().toISOString()
    }));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsAiSearch(false);
    
    if (!query) {
      // Fetch all mentors again when search is cleared
      getMentors().then(({ data }) => {
        if (data) setFilteredMentors(data);
      });
      return;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    const filtered = filteredMentors.filter((mentor) => {
      // Search by name
      if (mentor.name.toLowerCase().includes(lowerCaseQuery)) return true;
      
      // Search by department
      if (mentor.department.toLowerCase().includes(lowerCaseQuery)) return true;
      
      // Search by skills
      if (mentor.skills.some(skill => 
        skill.toLowerCase().includes(lowerCaseQuery)
      )) return true;
      
      return false;
    });
    
    setFilteredMentors(filtered);
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
