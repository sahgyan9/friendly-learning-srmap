
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import MentorCard from "@/components/MentorCard";
import { Link } from "react-router-dom";
import { mentors as localMentors } from "@/data/mentors";
import { supabase, getMentors } from "@/integrations/supabase/client";
import { Mentor } from "@/types/mentor";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
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

  const populateDatabase = async () => {
    setIsPopulating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('populate-mentors', {
        body: { clear: true }
      });
      
      if (error) {
        console.error("Error populating database:", error);
        toast({
          title: "Error",
          description: "Failed to populate database. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Mentor database has been populated successfully!",
        variant: "default",
      });
      
      console.log("Database populated:", data);
    } catch (err) {
      console.error("Exception populating database:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Find Your Mentor</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse our extensive list of qualified mentors or use the search to find 
              someone with the specific skills you need.
            </p>
            
            <div className="mt-4">
              <Button 
                onClick={populateDatabase}
                variant="outline"
                disabled={isPopulating}
                className="flex items-center gap-2"
              >
                {isPopulating && <Loader2 className="h-4 w-4 animate-spin" />}
                {isPopulating ? "Populating Database..." : "Populate Mentor Database"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Click to add sample mentors to the database for AI Search
              </p>
            </div>
          </div>
          
          {/* Search */}
          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />
          
          {/* AI Search Badge */}
          {isAiSearch && (
            <div className="flex items-center justify-center mb-8 gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
                AI-Powered Search Results
              </span>
            </div>
          )}
          
          {/* Loading State */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-lg">Loading mentors...</span>
            </div>
          ) : (
            <>
              {/* Mentors Grid */}
              {filteredMentors.length > 0 ? (
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
            </>
          )}
        </div>
      </main>
      
      <footer className="py-8 bg-white border-t border-gray-200">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Link to="/" className="text-xl font-bold text-primary tracking-tight flex items-center">
                <span className="mr-1">Friendly</span>
                <span className="text-gray-700">Learning</span>
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                Connecting students with mentors at SRM AP
              </p>
            </div>
            
            <div className="flex space-x-6">
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Friendly Learning. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Mentors;
