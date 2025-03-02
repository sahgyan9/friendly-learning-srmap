
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import PageHeader from "@/components/mentors/PageHeader";
import MentorList from "@/components/mentors/MentorList";
import Footer from "@/components/layout/Footer";
import { useMentorSearch } from "@/hooks/useMentorSearch";

const Mentors = () => {
  const {
    filteredMentors,
    isAiSearch,
    isPopulating,
    handleSearch,
    handleGeminiSearch,
    populateDatabase
  } = useMentorSearch();

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          {/* Page Header with Title and Populate Button */}
          <PageHeader 
            isPopulating={isPopulating} 
            onPopulateDatabase={populateDatabase} 
          />
          
          {/* Search */}
          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />
          
          {/* Mentor List with AI badge and grid/empty state */}
          <MentorList mentors={filteredMentors} isAiSearch={isAiSearch} />
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Mentors;
