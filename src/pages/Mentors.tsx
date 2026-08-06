import { PRIMARY_DOMAIN } from "@/lib/constants";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { getMentors } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { useHasVisitedMentorsNav } from "@/hooks/useFeatureAnnouncement";

// Import refactored components
import MentorList from "@/components/mentors/MentorList";
import MentorsFooter from "@/components/mentors/MentorsFooter";

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [mentorCount, setMentorCount] = useState(0);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { markSeen: markMentorsNavSeen } = useHasVisitedMentorsNav();

  // Reaching this page is what clears the welcome tour's navbar dot.
  useEffect(() => {
    markMentorsNavSeen();
  }, [markMentorsNavSeen]);



  // Fetch mentors from Supabase on component mount
  useEffect(() => {
    const fetchMentors = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await getMentors();

        if (error) {
          console.error("Error fetching mentors:", error);
          toast.error("Failed to load mentors. Please try again.");
          setFilteredMentors([]);
          return;
        }

        const mentors = data ?? [];
        setFilteredMentors(mentors);
        setMentorCount(mentors.length);
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        toast.error("An unexpected error occurred loading mentors.");
        setFilteredMentors([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, []);

  // Handle both normal search and AI search
  const handleSearch = async (query: string, results?: Mentor[]) => {
    setSearchQuery(query);
    setIsAiSearch(false);

    if (results) {
      setFilteredMentors(results);
    } else if (!query) {
      setIsLoading(true);
      const { data, error } = await getMentors();
      if (data && !error) {
        setFilteredMentors(data);
        setMentorCount(data.length);
      }
      setIsLoading(false);
    }
  };

  const handleGeminiSearch = (geminiResults: Mentor[]) => {
    setIsAiSearch(true);
    setFilteredMentors(geminiResults ?? []);
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "SRM AP Student Mentors",
    "description": "Browse verified student mentors at SRM University AP offering academic guidance and career support",
    "numberOfItems": mentorCount,
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
        title={`Find Student Mentors at Friendly Learning SRM AP | Browse ${mentorCount} Verified SRMAP Mentors`}
        description="Discover experienced student mentors at Friendly Learning SRM AP University in Amaravati. Browse profiles, skills, and reviews to find the perfect mentor for your academic journey. Connect with verified peer mentors from SRMAP today!"
        keywords="friendly learning srm ap, srmap mentorship platform, srmap friendly learning, SRM AP mentors directory, student mentors SRMAP, academic guidance amaravati, peer mentoring andhra pradesh, university mentorship srmap, SRM AP academic support, student tutoring amaravati"
        canonical={`${PRIMARY_DOMAIN}/mentors`}
      />

      <StructuredData data={structuredData} />
      <StructuredData data={getBreadcrumbSchema([
        { name: "Home", url: `${PRIMARY_DOMAIN}/` },
        { name: "Mentors", url: `${PRIMARY_DOMAIN}/mentors` }
      ])} />

      <div className="min-h-screen bg-background">
        {/* Hero header — same design language as Faculty / Groups / Posts */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/5 via-background to-background">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-primary/5 blur-2xl" />

          <div className="container mx-auto max-w-6xl px-4 pb-8 pt-28">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Pill label */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                <GraduationCap className="h-3.5 w-3.5" />
                Mentors
              </div>

              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Find Your Mentor</h1>
              <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                Browse verified student mentors at SRM AP or use AI-powered search to find someone
                with the exact skills you need.
              </p>

              {/* Live count pill */}
              {mentorCount > 0 && (
                <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm">
                  <strong className="text-primary">{mentorCount}</strong>
                  <span className="text-muted-foreground">verified mentors</span>
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Search + list */}
        <div className="container mx-auto max-w-6xl px-4 py-8">
          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />

          <MentorList
            isLoading={isLoading}
            mentors={filteredMentors}
            isAiSearch={isAiSearch}
          />
        </div>

        <MentorsFooter />
      </div>
    </>
  );
};

export default Mentors;
