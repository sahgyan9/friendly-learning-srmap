import { useState } from "react";
import SearchBar from "@/components/SearchBar";
import MentorCard from "@/components/MentorCard";
import { Mentor } from "@/types/mentor";
import { mentors } from "@/data/mentors";
import { getMentors, searchMentors } from "@/integrations/supabase/services/mentors";

const MentorsSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>(
    mentors.map(mentor => ({
      id: mentor.id,
      name: mentor.name,
      department: mentor.department,
      skills: mentor.skills,
      rating: mentor.rating,
      profile_image: mentor.profileImage,
      linkedin_url: mentor.linkedinUrl,
      bio: mentor.bio,
      review_count: mentor.reviewCount,
    }))
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query) {
      setFilteredMentors(mentors.map(mentor => ({
        id: mentor.id,
        name: mentor.name,
        department: mentor.department,
        skills: mentor.skills,
        rating: mentor.rating,
        profile_image: mentor.profileImage,
        linkedin_url: mentor.linkedinUrl,
        bio: mentor.bio,
        review_count: mentor.reviewCount,
      })));
      return;
    }
    
    const lowerCaseQuery = query.toLowerCase();
    const filtered = mentors.filter((mentor) => {
      if (mentor.name.toLowerCase().includes(lowerCaseQuery)) return true;
      if (mentor.department.toLowerCase().includes(lowerCaseQuery)) return true;
      if (mentor.skills.some(skill => 
        skill.toLowerCase().includes(lowerCaseQuery)
      )) return true;
      
      return false;
    });
    
    setFilteredMentors(filtered.map(mentor => ({
      id: mentor.id,
      name: mentor.name,
      department: mentor.department,
      skills: mentor.skills,
      rating: mentor.rating,
      profile_image: mentor.profileImage,
      linkedin_url: mentor.linkedinUrl,
      bio: mentor.bio,
      review_count: mentor.reviewCount,
    })));
  };

  const handleGeminiSearch = (geminiResults: any[]) => {
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
        
        {filteredMentors.length > 0 ? (
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
