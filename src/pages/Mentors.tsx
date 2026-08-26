import { PRIMARY_DOMAIN } from "@/lib/constants";

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { toast } from "sonner";
import { GraduationCap, Sparkles, Code, Cpu, Palette, Star, Users, CheckCircle2, Atom, Binary, FileText, PlusCircle } from "lucide-react";
import { motion } from "framer-motion";
import SearchBar from "@/components/SearchBar";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { getMentors } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { useHasVisitedMentorsNav } from "@/hooks/useFeatureAnnouncement";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

// Import refactored components
import MentorList from "@/components/mentors/MentorList";
import Footer from "@/components/Footer";
import { HorizontalScroller } from "@/components/ui/HorizontalScroller";
import { cn } from "@/lib/utils";

const DOMAIN_FILTERS = [
  { id: "all", label: "All Mentors & Peers", icon: Sparkles },
  { id: "tech", label: "Web & Dev", icon: Code },
  { id: "ai", label: "AI & Data Science", icon: Cpu },
  { id: "dsa", label: "DSA & Core CS", icon: Binary },
  { id: "quantum", label: "Quantum & Physics", icon: Atom },
  { id: "design", label: "Design & UI/UX", icon: Palette },
  { id: "alumni", label: "Alumni", icon: GraduationCap },
  { id: "top", label: "Top Rated ⭐", icon: Star },
];

const Mentors = () => {
  const { user, profile } = useAuth();
  const [allMentors, setAllMentors] = useState<Mentor[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<Mentor[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [mentorCount, setMentorCount] = useState(0);
  const [isAiSearch, setIsAiSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { markSeen: markMentorsNavSeen } = useHasVisitedMentorsNav();
  const cardsRef = useRef<HTMLDivElement>(null);

  // Reaching this page is what clears the welcome tour's navbar dot.
  useEffect(() => {
    markMentorsNavSeen();
  }, [markMentorsNavSeen]);

  // Scroll to cards before paint so hero is not visible on load, and re-run when isLoading finishes.
  useIsomorphicLayoutEffect(() => {
    const scrollToCards = () => {
      if (cardsRef.current) {
        const navbarHeight = 64; // matches fixed navbar height
        const top = cardsRef.current.getBoundingClientRect().top + window.scrollY - navbarHeight;
        window.scrollTo({ top, behavior: "instant" });
      }
    };

    scrollToCards();
    const timer = setTimeout(scrollToCards, 60);
    return () => clearTimeout(timer);
  }, [isLoading]);

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
    "name": "SRM AP Mentors and Peers",
    "description": "Browse active student mentors and peers at SRM AP offering course guidance, project help, and collaboration",
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
        title={`Find Mentors, Peers & Study Partners at SRM AP | Browse ${mentorCount} Active Mentors & Students`}
        description="Connect with experienced student mentors, club teammates, and peer study partners at SRM AP. Browse skills, coursework, and projects to find collaborators today."
        keywords="friendly learning srm ap, srmap mentorship platform, srmap peer directory, student mentors SRMAP, academic guidance amaravati, study partners srm ap, hackathon teams srm ap"
        canonical={`${PRIMARY_DOMAIN}/mentors`}
      />

      <StructuredData data={structuredData} />
      <StructuredData data={getBreadcrumbSchema([
        { name: "Home", url: `${PRIMARY_DOMAIN}/` },
        { name: "Mentors", url: `${PRIMARY_DOMAIN}/mentors` }
      ])} />

      <div className="min-h-screen bg-background">
        {/* Multi-tone Hero Header */}
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10">
          {/* Decorative floating gradient shapes */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-purple-500/15 blur-2xl" />
          <div className="pointer-events-none absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-sky-500/10 blur-2xl" />

          <div className="container mx-auto px-4 pb-5 pt-20 sm:pt-22">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Pill Label */}
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 backdrop-blur-sm shadow-xs">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                01 — Mentors & Peers
              </div>

              <h1 className="text-2xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text">
                Find Mentors, Peers & Study Partners
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
                Connect 1-on-1 with senior student mentors, club teammates, and peers across SRM AP for course guidance, hackathons, and project collaboration.
              </p>

              {/* Feature badges bar */}
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                {mentorCount > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <strong>{mentorCount}</strong> Active Peer{mentorCount === 1 ? "" : "s"} & Mentor{mentorCount === 1 ? "" : "s"}
                  </div>
                )}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  Free 1-on-1 Chat
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  AI Skill Matching
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Search + Quick Filter Chips + Grid */}
        <div ref={cardsRef} className="container mx-auto px-4 py-4">
          {/* Recognition / Discoverability Banner for logged in users */}
          {user && (
            allMentors.some((m) => m.id === user.id) ? (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium">You are live in the campus directory</span>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:text-primary gap-1 h-7 px-2.5 font-medium"
                >
                  <Link to={`/mentor/${user.id}`}>
                    View My Public Card →
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mb-4 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Make Yourself Discoverable
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/90">
                    Want classmates and juniors to find you for hackathons, study sessions & coursework?
                  </p>
                </div>
                <Button
                  asChild
                  size="sm"
                  className="gap-1.5 shrink-0 text-xs font-medium"
                >
                  <Link to="/profile/setup">
                    <FileText className="h-3.5 w-3.5" />
                    Auto-Fill Profile in 10s
                  </Link>
                </Button>
              </div>
            )
          )}

          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />

          {/* Clean Standard Domain Filter Pills — horizontally scrollable */}
          <HorizontalScroller className="mt-4 mb-4 flex items-center gap-2 py-2 px-1" ariaLabel="Mentor domain filters">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap mr-1 shrink-0">Filter by:</span>
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
                    isActive
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {filter.label}
                </button>
              );
            })}
          </HorizontalScroller>

          <MentorList
            isLoading={isLoading}
            mentors={filteredMentors}
            isAiSearch={isAiSearch}
          />
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Mentors;
