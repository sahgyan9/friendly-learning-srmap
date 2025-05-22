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

  // Search function now handles both dynamic and manual searches
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsAiSearch(false);
    setIsLoading(true);
    
    try {
      // If search is cleared, show all mentors again
      if (!query.trim()) {
        const { data, error } = await getMentors();
        if (data && !error) {
          setFilteredMentors(data);
        } else {
          setFilteredMentors(sampleMentors);
        }
        return;
      }
      
      // Otherwise, perform search
      const { data, error } = await searchMentors(query);
      if (error) {
        throw error;
      }
      
      if (data) {
        setFilteredMentors(data);
      } else {
        setFilteredMentors([]);
      }
    } catch (err) {
      console.error("Search error:", err);
      toast({
        title: "Search error",
        description: "Failed to search mentors",
        variant: "destructive",
      });
      setFilteredMentors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeminiSearch = (geminiResults: Mentor[]) => {
    setIsAiSearch(true);
    setIsLoading(false);
    
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
              description="Use our dynamic search or AI-powered search to find an ideal mentor with the specific skills you need."
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
