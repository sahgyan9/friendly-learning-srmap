
import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MentorCard from "@/components/MentorCard";
import { Mentor } from "@/types/mentor";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

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

const MentorsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>(mockMentors);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simple local search function
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query) {
      setFilteredMentors(mockMentors);
      return;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    const results = mockMentors.filter(mentor => 
      mentor.name.toLowerCase().includes(lowerCaseQuery) ||
      mentor.department.toLowerCase().includes(lowerCaseQuery) ||
      mentor.skills.some(skill => skill.toLowerCase().includes(lowerCaseQuery)) ||
      (mentor.bio && mentor.bio.toLowerCase().includes(lowerCaseQuery))
    );
    
    setFilteredMentors(results);
  };

  const handleGeminiSearch = (geminiResults: any[]) => {
    // Simulate finding matches in our mock data
    const mappedMentors = mockMentors.slice(0, geminiResults.length > 0 ? geminiResults.length : 1);
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
