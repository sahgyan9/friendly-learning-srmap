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
  const [allMentors, setAllMentors] = useState<Mentor[]>([]);
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
          setAllMentors(sampleMentors);
          setFilteredMentors(sampleMentors.slice(0, 8));
          return;
        }

        if (data && data.length > 0) {
          // Store all mentors but only display a limited number initially
          setAllMentors(data);
          setFilteredMentors(data.slice(0, 8));
        } else {
          // Use sample data as fallback if no mentors in database
          setAllMentors(sampleMentors);
          setFilteredMentors(sampleMentors.slice(0, 8));
          toast({
            title: "Using sample data",
            description: "No mentors found in database. Using sample data instead.",
          });
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        // Use sample data as fallback
        setAllMentors(sampleMentors);
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsAiSearch(false);

    if (!query) {
      // Show first 8 mentors when search is cleared
      setFilteredMentors(allMentors.slice(0, 8));
      return;
    }

    // Client-side filtering - no API calls while typing
    const searchLower = query.toLowerCase();
    const filtered = allMentors.filter(mentor => {
      return (
        mentor.name.toLowerCase().includes(searchLower) ||
        mentor.department.toLowerCase().includes(searchLower) ||
        mentor.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
        (mentor.bio && mentor.bio.toLowerCase().includes(searchLower))
      );
    });

    setFilteredMentors(filtered);

    if (filtered.length === 0) {
      toast({
        title: "No results found",
        description: "Try a different search term or browse all mentors.",
      });
    }
  };

  const handleGeminiSearch = (geminiResults: any[]) => {
    setIsAiSearch(true);

    if (!geminiResults || geminiResults.length === 0) {
      setFilteredMentors([]);
      return;
    }

    // Make sure we're getting complete mentor objects
    const validMentors = geminiResults.filter(mentor =>
      mentor && mentor.id && mentor.name && mentor.department
    );

    console.log("Valid mentors for display in MentorsSection:", validMentors);

    if (validMentors.length === 0) {
      toast({
        title: "Processing error",
        description: "Received incomplete mentor data from AI search",
        variant: "destructive",
      });
      return;
    }

    setFilteredMentors(validMentors);
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
