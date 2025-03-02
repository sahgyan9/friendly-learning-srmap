
import { useState } from "react";
import { mentors, Mentor } from "@/data/mentors";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export const useMentorSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>(mentors);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const { toast } = useToast();

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsAiSearch(false);
    
    if (!query) {
      setFilteredMentors(mentors);
      return;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    const filtered = mentors.filter((mentor) => {
      // Search by name
      if (mentor.name.toLowerCase().includes(lowerCaseQuery)) return true;
      
      // Search by department
      if (mentor.department.toLowerCase().includes(lowerCaseQuery)) return true;
      
      // Search by skills
      if (mentor.skills.some(skill => 
        skill.toLowerCase().includes(lowerCaseQuery)
      )) return true;
      
      return false;
    });
    
    setFilteredMentors(filtered);
  };

  const handleGeminiSearch = (geminiResults: any[]) => {
    setIsAiSearch(true);
    
    if (!geminiResults || geminiResults.length === 0) {
      setFilteredMentors([]);
      return;
    }

    // Map the Supabase mentor format to the local format
    const mappedMentors = geminiResults.map(dbMentor => {
      return {
        id: dbMentor.id,
        name: dbMentor.name,
        department: dbMentor.department,
        skills: dbMentor.skills,
        rating: dbMentor.rating,
        profileImage: dbMentor.profile_image,
        linkedinUrl: dbMentor.linkedin_url,
        bio: dbMentor.bio,
        reviewCount: dbMentor.review_count
      } as Mentor;
    });
    
    setFilteredMentors(mappedMentors);
  };

  const populateDatabase = async () => {
    setIsPopulating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('populate-mentors', {
        body: { clear: true }
      });
      
      if (error) {
        console.error("Error populating database:", error);
        toast({
          title: "Error",
          description: "Failed to populate database. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Mentor database has been populated successfully!",
        variant: "default",
      });
      
      console.log("Database populated:", data);
    } catch (err) {
      console.error("Exception populating database:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  return {
    searchQuery,
    filteredMentors,
    isAiSearch,
    isPopulating,
    handleSearch,
    handleGeminiSearch,
    populateDatabase
  };
};
