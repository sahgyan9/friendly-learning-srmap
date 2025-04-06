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
  const [allMentors, setAllMentors] = useState<Mentor[]>([]);
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
          setAllMentors(sampleMentors);
          return;
        }

        if (data && data.length > 0) {
          setFilteredMentors(data);
          setAllMentors(data);
        } else {
          console.log("No mentors found in database, using sample data");
          setFilteredMentors(sampleMentors);
          setAllMentors(sampleMentors);
          toast({
            title: "Using sample data",
            description: "No mentors found in database. Using sample data instead.",
          });
        }
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        setFilteredMentors(sampleMentors);
        setAllMentors(sampleMentors);
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
      // Show all mentors when search is cleared
      setFilteredMentors(allMentors);
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
