
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { Mentor } from "@/types/mentor";
import { useToast } from "@/components/ui/use-toast";

// Import refactored components
import MentorList from "@/components/mentors/MentorList";
import MentorsHeader from "@/components/mentors/MentorsHeader";
import MentorsFooter from "@/components/mentors/MentorsFooter";

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

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>(mockMentors);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Simple local search function
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsAiSearch(false);
    
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
    setIsAiSearch(true);
    
    if (!geminiResults || geminiResults.length === 0) {
      setFilteredMentors([]);
      return;
    }
    
    // Simulate finding matches in our mock data
    const results = mockMentors.filter(mentor => 
      geminiResults.some(result => result.name === mentor.name)
    );
    
    setFilteredMentors(results.length > 0 ? results : mockMentors.slice(0, 1));
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
