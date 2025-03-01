
import { useState } from "react";
import Navbar from "@/components/Navbar";
import SearchBar from "@/components/SearchBar";
import MentorCard from "@/components/MentorCard";
import { Link } from "react-router-dom";
import { mentors, Mentor } from "@/data/mentors";

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>(mentors);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
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

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Find Your Mentor</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Browse our extensive list of qualified mentors or use the search to find 
              someone with the specific skills you need.
            </p>
          </div>
          
          {/* Search */}
          <SearchBar onSearch={handleSearch} />
          
          {/* Mentors Grid */}
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
      </main>
      
      <footer className="py-8 bg-white border-t border-gray-200">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Link to="/" className="text-xl font-bold text-primary tracking-tight flex items-center">
                <span className="mr-1">Friendly</span>
                <span className="text-gray-700">Learning</span>
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                Connecting students with mentors at SRM AP
              </p>
            </div>
            
            <div className="flex space-x-6">
              <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">
                About
              </Link>
              <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms
              </Link>
              <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contact
              </Link>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Friendly Learning. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Mentors;
