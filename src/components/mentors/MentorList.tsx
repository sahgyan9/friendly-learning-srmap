
import { Mentor } from "@/data/mentors";
import MentorCard from "@/components/MentorCard";

interface MentorListProps {
  mentors: Mentor[];
  isAiSearch: boolean;
}

const MentorList = ({ mentors, isAiSearch }: MentorListProps) => {
  return (
    <>
      {/* AI Search Badge */}
      {isAiSearch && (
        <div className="flex items-center justify-center mb-8 gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            AI-Powered Search Results
          </span>
        </div>
      )}
      
      {/* Mentors Grid */}
      {mentors.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {mentors.map((mentor) => (
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
    </>
  );
};

export default MentorList;
