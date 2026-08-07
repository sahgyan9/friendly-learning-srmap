
import { Loader2 } from "lucide-react";
import MentorCard from "@/components/MentorCard";
import { Mentor } from "@/types/mentor";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface MentorListProps {
  isLoading: boolean;
  mentors: Mentor[];
  isAiSearch: boolean;
}

const MentorList = ({ isLoading, mentors, isAiSearch }: MentorListProps) => {
  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(8)].map((_, index) => (
          <Card key={index} className="p-6 space-y-4">
            {/* Avatar skeleton */}
            <div className="flex justify-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>

            {/* Name skeleton */}
            <Skeleton className="h-6 w-3/4 mx-auto" />

            {/* Department skeleton */}
            <Skeleton className="h-4 w-1/2 mx-auto" />

            {/* Skills skeletons */}
            <div className="flex gap-2 justify-center flex-wrap">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-14" />
            </div>

            {/* Rating skeleton */}
            <Skeleton className="h-4 w-24 mx-auto" />

            {/* Button skeleton */}
            <Skeleton className="h-10 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <motion.div
        className="text-center py-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <h3 className="text-xl font-medium mb-2">No mentors found</h3>
        <p className="text-muted-foreground">
          Try adjusting your search or browse all available mentors.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={container}
    >
      {/* AI Search Badge */}
      {isAiSearch && (
        <motion.div
          className="flex items-center justify-center mb-8 gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary dark:bg-primary/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
            AI-Powered Search Results
          </span>
        </motion.div>
      )}

      {/* Mentors Grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
        variants={container}
      >
        {mentors.map((mentor) => (
          <motion.div key={mentor.id} variants={item}>
            <MentorCard mentor={mentor} />
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default MentorList;
