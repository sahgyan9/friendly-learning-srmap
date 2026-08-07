import { PRIMARY_DOMAIN } from "@/lib/constants";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { GraduationCap, Sparkles, Code, Cpu, Palette, Star, Users, CheckCircle2, Atom, Binary } from "lucide-react";
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
import { cn } from "@/lib/utils";

const DOMAIN_FILTERS = [
  { id: "all", label: "All Mentors", icon: Sparkles, color: "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20" },
  { id: "tech", label: "Web & Dev", icon: Code, color: "border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10 hover:bg-sky-500/20" },
  { id: "ai", label: "AI & Data Science", icon: Cpu, color: "border-indigo-500/30 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20" },
  { id: "dsa", label: "DSA & Core CS", icon: Binary, color: "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20" },
  { id: "quantum", label: "Quantum & Physics", icon: Atom, color: "border-teal-500/30 text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20" },
  { id: "design", label: "Design & UI/UX", icon: Palette, color: "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20" },
  { id: "alumni", label: "Alumni", icon: GraduationCap, color: "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20" },
  { id: "top", label: "Top Rated ⭐", icon: Star, color: "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20" },
];

const Mentors = () => {
  const [allMentors, setAllMentors] = useState<Mentor[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
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
        setAllMentors(mentors);
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

  const applyCategoryFilter = (filterId: string, mentorsToFilter: Mentor[] = allMentors) => {
    setActiveFilter(filterId);
    if (filterId === "all") {
      setFilteredMentors(mentorsToFilter);
      return;
    }
    if (filterId === "alumni") {
      setFilteredMentors(mentorsToFilter.filter(m => m.is_alumni));
      return;
    }
    if (filterId === "top") {
      setFilteredMentors(mentorsToFilter.filter(m => m.rating >= 4.5));
      return;
    }

    const keyword = filterId === "tech" ? ["web", "code", "react", "node", "dev", "frontend", "backend", "fullstack", "js", "ts"]
                  : filterId === "ai" ? ["ai", "ml", "data", "python", "machine learning", "sql", "model"]
                  : filterId === "dsa" ? ["dsa", "algo", "data structure", "c++", "java", "os", "dbms", "core"]
                  : filterId === "quantum" ? ["quantum", "physic", "research", "qiskit", "atomic", "paper"]
                  : ["design", "ui", "ux", "figma", "art", "creative"];

    setFilteredMentors(
      mentorsToFilter.filter(m =>
        m.skills.some(skill => keyword.some(k => skill.toLowerCase().includes(k))) ||
        keyword.some(k => (m.bio || "").toLowerCase().includes(k))
      )
    );
  };

  // Handle both normal search and AI search
  const handleSearch = async (query: string, results?: Mentor[]) => {
    setSearchQuery(query);
    setIsAiSearch(false);
    setActiveFilter("all");

    if (results) {
      setFilteredMentors(results);
    } else if (!query) {
      setFilteredMentors(allMentors);
    }
  };

  const handleGeminiSearch = (geminiResults: Mentor[]) => {
    setIsAiSearch(true);
    setActiveFilter("all");
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
        {/* Vibrant Multi-tone Hero Header */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10">
          {/* Decorative floating gradient shapes */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="pointer-events-none absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-sky-500/10 blur-2xl" />

          <div className="container mx-auto max-w-6xl px-4 pb-5 pt-20 sm:pt-22">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Vibrant Pill Label */}
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 backdrop-blur-sm shadow-sm">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                01 — Peer Mentors
              </div>

              <h1 className="text-2xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                Find Your Perfect Mentor
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
                Connect 1-on-1 with verified senior student & alumni mentors at SRM AP for course guidance, project help, and career advice.
              </p>

              {/* Colorful feature badges bar */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {mentorCount > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    <strong>{mentorCount}</strong> Verified Mentors
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Free 1-on-1 Chat
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  AI Skill Matching
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Search + Quick Filter Chips + Grid */}
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />

          {/* Colorful Quick Domain Filter Pills — py-2 px-1 ensures active ring borders don't get clipped */}
          <div className="mt-4 mb-4 flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-none">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap mr-1">Filter by:</span>
            {DOMAIN_FILTERS.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => applyCategoryFilter(filter.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                    filter.color,
                    isActive
                      ? "ring-2 ring-blue-500/60 shadow-md font-semibold bg-blue-500/20"
                      : "opacity-80 hover:opacity-100"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filter.label}
                </button>
              );
            })}
          </div>

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
