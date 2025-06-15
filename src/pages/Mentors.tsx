
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import SEOHead from "@/components/SEOHead";
import { getMentors } from "@/integrations/supabase/services/mentors";
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

  // Handle both normal search and AI search
  const handleSearch = async (query: string, results?: Mentor[]) => {
    setSearchQuery(query);
    setIsAiSearch(false);
    
    if (results) {
      // If results are provided directly (from dynamic search)
      setFilteredMentors(results);
    } else if (!query) {
      // If search is cleared, show all mentors again
      setIsLoading(true);
      const { data, error } = await getMentors();
      if (data && !error) {
        setFilteredMentors(data);
      } else {
        setFilteredMentors(sampleMentors);
      }
      setIsLoading(false);
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

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "SRM AP Student Mentors",
    "description": "Browse verified student mentors at SRM University AP offering academic guidance and career support",
    "numberOfItems": filteredMentors.length,
    "itemListElement": filteredMentors.slice(0, 10).map((mentor, index) => ({
      "@type": "Person",
      "position": index + 1,
      "name": mentor.name,
      "description": mentor.bio,
      "knowsAbout": mentor.skills,
      "affiliation": {
        "@type": "EducationalOrganization",
        "name": "SRM University AP"
      }
    }))
  };

  return (
    <>
      <SEOHead
        title={`Find Student Mentors at SRM AP | Browse ${filteredMentors.length} Verified Mentors - Friendly Learning`}
        description="Discover experienced student mentors at SRM University AP. Browse profiles, skills, and reviews to find the perfect mentor for your academic journey. Connect with verified peer mentors today!"
        keywords="SRM AP mentors directory, student mentors SRM, academic guidance, peer mentoring, university mentorship, SRM AP academic support, student tutoring"
        canonical="https://friendly-learning.lovable.app/mentors"
        structuredData={structuredData}
      />
      
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
                title="Find Your Perfect Mentor at SRM AP" 
                description="Browse our extensive directory of verified student mentors or use our AI-powered search to find mentors with specific skills and expertise tailored to your academic needs."
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
    </>
  );
};

export default Mentors;
