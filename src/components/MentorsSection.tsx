import { useState, useEffect, Suspense, lazy } from "react";
import { getMentors } from "@/integrations/supabase/services/mentors";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Mentor } from "@/types/mentor";

// Lazy load heavy components
const SearchBar = lazy(() => import("@/components/SearchBar"));
const MentorCard = lazy(() => import("@/components/MentorCard"));
const MentorsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const {
    toast
  } = useToast();

  // Fetch mentors from Supabase on component mount
  useEffect(() => {
    const fetchMentors = async () => {
      setIsLoading(true);
      try {
        const {
          data,
          error
        } = await getMentors();
        if (error) {
          console.error("Error fetching mentors:", error);
          toast({
            title: "Error",
            description: "Failed to load mentors.",
            variant: "destructive"
          });
          setFilteredMentors([]);
          return;
        }
        if (data && data.length > 0) {
          // Only display a limited number initially for faster rendering
          setFilteredMentors(data.slice(0, 8));
        } else {
          setFilteredMentors([]);
          toast({
            title: "No mentors found",
            description: "There are currently no mentors available."
          });
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        setFilteredMentors([]);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive"
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
      const {
        data
      } = await getMentors();
      if (data) setFilteredMentors(data.slice(0, 8));
      return;
    }

    // Use the searchMentors function from Supabase services
    const {
      data,
      error
    } = await import("@/integrations/supabase/services/mentors").then(module => module.searchMentors(query));
    if (error) {
      console.error("Error searching mentors:", error);
      toast({
        title: "Search Error",
        description: "Failed to search mentors. Please try again.",
        variant: "destructive"
      });
      return;
    }
    setFilteredMentors(data || []);
  };
  const handleGeminiSearch = (geminiResults: any[]) => {
    setIsAiSearch(true);
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

  // SearchBar skeleton component
  const SearchBarSkeleton = () => <div className="w-full max-w-3xl mx-auto mb-10">
      <div className="flex items-center gap-2">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-24 rounded-md" />
        <Skeleton className="h-12 w-32 rounded-md" />
      </div>
      <div className="mt-2 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-28" />
      </div>
    </div>;

  // MentorCard skeleton component
  const MentorCardSkeleton = () => <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-[260px]">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <div className="mt-4 mb-5">
        <Skeleton className="h-4 w-16 mb-2" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-10 flex-1 rounded-md" />
        <Skeleton className="h-10 flex-1 rounded-md" />
      </div>
    </div>;
  return <section className="py-16 bg-slate-800">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Find Your Mentor</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Search from our pool of experienced senior students who are ready 
            to help you excel in your academic journey.
          </p>
        </div>
        
        <Suspense fallback={<SearchBarSkeleton />}>
          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />
        </Suspense>
        
        {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => <MentorCardSkeleton key={index} />)}
          </div> : filteredMentors.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <Suspense fallback={<div className="col-span-full flex justify-center py-8"><Loader2 className="animate-spin h-8 w-8" /></div>}>
              {filteredMentors.map(mentor => <MentorCard key={mentor.id} mentor={mentor} />)}
            </Suspense>
          </div> : <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">No mentors found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or browse all available mentors.
            </p>
          </div>}
        
        {/* View all mentors link */}
        {filteredMentors.length > 0 && <div className="text-center mt-8">
            <a href="/mentors" className="text-primary font-medium hover:underline">
              View all mentors →
            </a>
          </div>}
      </div>
    </section>;
};
export default MentorsSection;