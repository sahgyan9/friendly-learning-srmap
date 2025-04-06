
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { getMentors, searchMentors } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { sampleMentors } from "@/data/mentors";

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

  // Fade in animation variants
  const pageVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.6,
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

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
          setFilteredMentors(sampleMentors);
          return;
        }
        
        if (data && data.length > 0) {
          setFilteredMentors(data);
        } else {
          console.log("No mentors found in database, using sample data");
          setFilteredMentors(sampleMentors);
          toast({
            title: "Using sample data",
            description: "No mentors found in database. Using sample data instead.",
          });
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        setFilteredMentors(sampleMentors);
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
      const { data, error } = await getMentors();
      if (data && !error) {
        setFilteredMentors(data);
      } else {
        setFilteredMentors(sampleMentors);
      }
      return;
    }
    
    // Use Supabase search function with improved error handling
    try {
      const { data, error } = await searchMentors(query);
      
      if (error) {
        console.error("Error searching mentors:", error);
        // Don't show errors during typing, just maintain current results
        return;
      }
      
      if (data && data.length > 0) {
        setFilteredMentors(data);
      } else {
        // Try searching in sample data as fallback only if no mentors found in database
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
      }
    } catch (err) {
      console.error("Exception during search:", err);
      // Don't show errors during typing, just log them
    }
  };

  const handleGeminiSearch = (geminiResults: Mentor[]) => {
    setIsAiSearch(true);
    
    if (!geminiResults || geminiResults.length === 0) {
      setFilteredMentors([]);
      return;
    }
    
    setFilteredMentors(geminiResults);
  };

  return (
    <motion.div 
      className="min-h-screen"
      initial="hidden"
      animate="visible"
      variants={pageVariants}
    >
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <motion.div variants={itemVariants}>
            <MentorsHeader 
              title="Find Your Mentor" 
              description="Browse our extensive list of qualified mentors or use the search to find someone with the specific skills you need."
            />
          </motion.div>
          
          {/* Search */}
          <motion.div variants={itemVariants}>
            <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />
          </motion.div>
          
          {/* Mentors List */}
          <motion.div variants={itemVariants}>
            <MentorList 
              isLoading={isLoading} 
              mentors={filteredMentors} 
              isAiSearch={isAiSearch} 
            />
          </motion.div>
        </div>
      </main>
      
      <MentorsFooter />
    </motion.div>
  );
};

export default Mentors;
