
import { useState, useEffect, Suspense, lazy } from "react";
import { getMentors, searchMentors } from "@/integrations/supabase/services/mentors";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Mentor } from "@/types/mentor";
import { sampleMentors } from "@/data/mentors";

// Import refactored components
import SearchBarSkeleton from "@/components/mentors/loaders/SearchBarSkeleton";
import MentorsGridSkeleton from "@/components/mentors/loaders/MentorsGridSkeleton";
import EmptyMentorsState from "@/components/mentors/EmptyMentorsState";
import SectionHeader from "@/components/mentors/SectionHeader";
import ViewAllLink from "@/components/mentors/ViewAllLink";

// Lazy load heavy components
const SearchBar = lazy(() => import("@/components/SearchBar"));
const MentorCard = lazy(() => import("@/components/MentorCard"));

const MentorsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiSearch, setIsAiSearch] = useState(false);
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
            description: "Failed to load mentors. Using sample data instead.",
            variant: "destructive",
          });
          // Use sample data as fallback
          setFilteredMentors(sampleMentors.slice(0, 8));
          return;
        }
        
        if (data && data.length > 0) {
          // Only display a limited number initially for faster rendering
          setFilteredMentors(data.slice(0, 8));
        } else {
          // Use sample data as fallback if no mentors in database
          setFilteredMentors(sampleMentors.slice(0, 8));
          toast({
            title: "Using sample data",
            description: "No mentors found in database. Using sample data instead.",
          });
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        // Use sample data as fallback
        setFilteredMentors(sampleMentors.slice(0, 8));
        toast({
          title: "Error",
          description: "An unexpected error occurred. Using sample data instead.",
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
    setIsAiSearch(false);
    
    if (!query) {
      // Fetch all mentors again when search is cleared
      const { data } = await getMentors();
      if (data && data.length > 0) {
        setFilteredMentors(data.slice(0, 8));
      } else {
        setFilteredMentors(sampleMentors.slice(0, 8));
      }
      return;
    }
    
    // Use the searchMentors function from Supabase services
    try {
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
      
      if (data && data.length > 0) {
        setFilteredMentors(data);
      } else {
        // Try searching in sample data as fallback
        const filteredSampleMentors = sampleMentors.filter(mentor => {
          const searchLower = query.toLowerCase();
          return (
            mentor.name.toLowerCase().includes(searchLower) ||
            mentor.department.toLowerCase().includes(searchLower) ||
            mentor.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
            (mentor.bio && mentor.bio.toLowerCase().includes(searchLower))
          );
        });
        
        setFilteredMentors(filteredSampleMentors);
        
        if (filteredSampleMentors.length === 0) {
          toast({
            title: "No results found",
            description: "Try a different search term or browse all mentors.",
          });
        }
      }
    } catch (err) {
      console.error("Exception during search:", err);
      toast({
        title: "Search Error",
        description: "An unexpected error occurred during search.",
        variant: "destructive",
      });
    }
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
    <section className="py-16 bg-secondary/50 dark:bg-gray-900/30">
      <div className="container px-4 md:px-6">
        <SectionHeader 
          title="Find Your Mentor"
          description="Search from our pool of experienced senior students who are ready 
            to help you excel in your academic journey."
        />
        
        <Suspense fallback={<SearchBarSkeleton />}>
          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />
        </Suspense>
        
        {isLoading ? (
          <MentorsGridSkeleton />
        ) : filteredMentors.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <Suspense fallback={<div className="col-span-full flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8" /></div>}>
              {filteredMentors.map((mentor) => (
                <MentorCard key={mentor.id} mentor={mentor} />
              ))}
            </Suspense>
          </div>
        ) : (
          <EmptyMentorsState />
        )}
        
        {/* View all mentors link */}
        {filteredMentors.length > 0 && (
          <ViewAllLink url="/mentors" />
        )}
      </div>
    </section>
  );
};

export default MentorsSection;
