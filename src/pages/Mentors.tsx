
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import { getMentors, searchMentors } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

// Import refactored components
import MentorList from "@/components/mentors/MentorList";
import MentorsHeader from "@/components/mentors/MentorsHeader";
import MentorsFooter from "@/components/mentors/MentorsFooter";

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [learningSuggestions, setLearningSuggestions] = useState<any[]>([]);
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
    setLearningSuggestions([]);
    
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

  const handleGeminiSearch = (geminiResults: Mentor[], suggestions: any[] = []) => {
    setIsAiSearch(true);
    
    if (!geminiResults || geminiResults.length === 0) {
      setFilteredMentors([]);
      return;
    }
    
    setFilteredMentors(geminiResults);
    setLearningSuggestions(suggestions);
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
              learningSuggestions={learningSuggestions}
            />
          </motion.div>
        </div>
      </main>
      
      <MentorsFooter />
    </motion.div>
  );
};

export default Mentors;
