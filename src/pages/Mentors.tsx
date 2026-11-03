import { PRIMARY_DOMAIN } from "@/lib/constants";

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useIsomorphicLayoutEffect } from "@/hooks/useIsomorphicLayoutEffect";
import { toast } from "sonner";
import { ArrowRight, FileText } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { getMentors } from "@/integrations/supabase/services/mentors";
import { getOfflineCache, setOfflineCache } from "@/lib/offline/offlineStorage";
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
  { id: "all", label: "All" },
  { id: "tech", label: "Web & Dev" },
  { id: "ai", label: "AI & Data Science" },
  { id: "dsa", label: "DSA & Core CS" },
  { id: "quantum", label: "Quantum & Physics" },
  { id: "design", label: "Design & UI/UX" },
  { id: "alumni", label: "Alumni" },
  { id: "top", label: "Rated 4.5+" },
];

/** Pure so each chip can show how many mentors it will leave in the grid. */
const filterMentors = (filterId: string, mentors: Mentor[]): Mentor[] => {
  if (filterId === "all") return mentors;
  if (filterId === "alumni") return mentors.filter(m => m.is_alumni);
  if (filterId === "top") return mentors.filter(m => m.rating >= 4.5);

  const keyword = filterId === "tech" ? ["web", "code", "react", "node", "dev", "frontend", "backend", "fullstack", "js", "ts"]
                : filterId === "ai" ? ["ai", "ml", "data", "python", "machine learning", "sql", "model"]
                : filterId === "dsa" ? ["dsa", "algo", "data structure", "c++", "java", "os", "dbms", "core"]
                : filterId === "quantum" ? ["quantum", "physic", "research", "qiskit", "atomic", "paper"]
                : ["design", "ui", "ux", "figma", "art", "creative"];

  return mentors.filter(m =>
    m.skills.some(skill => keyword.some(k => skill.toLowerCase().includes(k))) ||
    keyword.some(k => (m.bio || "").toLowerCase().includes(k))
  );
};

const MENTORS_CACHE_KEY = "mentors_list";

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

  // Show the mentors this device already knows about while the current list
  // is fetched. The filters and search below run over whatever is in state,
  // so a restored list is filterable straight away.
  //
  // A layout effect, because isLoading starts true: seeding from the fetch
  // effect below is one render too late and paints a frame of skeletons
  // first, which is the flicker this is meant to remove.
  const seededFromCacheRef = useRef(false);

  useIsomorphicLayoutEffect(() => {
    const cached = getOfflineCache<Mentor[]>(MENTORS_CACHE_KEY);
    if (!cached?.data?.length) return;

    setAllMentors(cached.data);
    setFilteredMentors(cached.data);
    setMentorCount(cached.data.length);
    setIsLoading(false);
    seededFromCacheRef.current = true;
  }, []);

  // Fetch mentors from Supabase on component mount
  useEffect(() => {
    const fetchMentors = async () => {
      if (!seededFromCacheRef.current) setIsLoading(true);

      try {
        const { data, error } = await getMentors();

        if (error) {
          console.error("Error fetching mentors:", error);
          toast.error("Could not load mentors. Reload the page to try again.");
          // Emptied only when there is nothing to fall back on. Clearing a
          // restored list because one request failed would replace a slightly
          // old directory with no directory at all.
          if (!seededFromCacheRef.current) setFilteredMentors([]);
          return;
        }

        const mentors = data ?? [];
        setAllMentors(mentors);
        setFilteredMentors(mentors);
        setMentorCount(mentors.length);
        setOfflineCache(MENTORS_CACHE_KEY, mentors);
      } catch (err) {
        console.error("Exception fetching mentors:", err);
        toast.error("Could not load mentors. Try again later.");
        if (!seededFromCacheRef.current) setFilteredMentors([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMentors();
  }, []);

  const applyCategoryFilter = (filterId: string, mentorsToFilter: Mentor[] = allMentors) => {
    setActiveFilter(filterId);
    setFilteredMentors(filterMentors(filterId, mentorsToFilter));
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
        <header className="border-b border-border">
          <div className="container mx-auto px-4 pb-6 pt-20 sm:pt-24 animate-fade-up">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Mentors and peers</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Find a senior, alumnus or classmate who knows the course, club or project you are working on, and message them directly.
            </p>
            {mentorCount > 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular">{mentorCount}</span> people listed
              </p>
            )}
          </div>
        </header>

        <div ref={cardsRef} className="container mx-auto px-4 py-6">
          {user && (
            allMentors.some((m) => m.id === user.id) ? (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
                <p className="flex min-w-0 items-center gap-2 text-sm text-foreground">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                  <span className="truncate">Your profile is listed in the directory.</span>
                </p>
                <Link
                  to={`/mentor/${user.id}`}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View your card
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="mb-4 flex flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">You are not listed yet</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Set up a profile so classmates and juniors can find you for projects, hackathons and study sessions.
                  </p>
                </div>
                <Button asChild size="sm" className="shrink-0">
                  <Link to="/profile/setup">
                    <FileText />
                    Set up profile
                  </Link>
                </Button>
              </div>
            )
          )}

          <SearchBar onSearch={handleSearch} onGeminiSearch={handleGeminiSearch} />

          {/* Each chip shows how many cards it leaves in the grid below, so the
              mapping from control to result is visible before clicking. */}
          <HorizontalScroller className="mt-4 flex items-center gap-2 px-0.5 py-1" ariaLabel="Filter mentors by topic">
            {DOMAIN_FILTERS.map((filter) => {
              const isActive = activeFilter === filter.id;
              const count = filterMentors(filter.id, allMentors).length;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => applyCategoryFilter(filter.id)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm transition-colors duration-150",
                    isActive
                      ? "border-primary bg-primary font-medium text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {filter.label}
                  {allMentors.length > 0 && (
                    <span className={cn("text-xs tabular", isActive ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </HorizontalScroller>

          {!isLoading && (
            <p className="mb-4 mt-3 text-sm text-muted-foreground" aria-live="polite">
              {isAiSearch || searchQuery
                ? `${filteredMentors.length} ${filteredMentors.length === 1 ? "result" : "results"}`
                : activeFilter === "all"
                  ? `Showing all ${filteredMentors.length}`
                  : `Showing ${filteredMentors.length} of ${allMentors.length}`}
            </p>
          )}

          <MentorList
            isLoading={isLoading}
            mentors={filteredMentors}
            isAiSearch={isAiSearch}
            onReset={activeFilter !== "all" ? () => applyCategoryFilter("all") : undefined}
          />
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Mentors;
