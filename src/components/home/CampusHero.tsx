import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Users, GraduationCap, Building2, MessageSquare } from "lucide-react";
import AskBox from "@/components/search/AskBox";
import { getPlatformStats, type PlatformStats } from "@/integrations/supabase/services/platform-stats";
import { getTrendingSearches, MIN_TRENDING_TO_SHOW } from "@/lib/search/trending";

const QUICK_PROMPTS = [
  { label: "🤖 AI & ML Mentors", query: "Who knows AI and machine learning for a project?" },
  { label: "💻 DSA & Coding help", query: "Senior mentors for Data Structures and Algorithms" },
  { label: "🚀 Hackathon teammates", query: "Looking for teammates for hackathon web development" },
  { label: "👨‍🏫 Find faculty for research", query: "Faculty researching computer vision and deep learning" },
];

export const CampusHero = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [trending, setTrending] = useState<{ label: string; query: string }[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats().then((result) => {
      if (!cancelled) setStats(result);
    });
    getTrendingSearches(6).then((result) => {
      if (cancelled) return;
      setTrending(
        result.length >= MIN_TRENDING_TO_SHOW
          ? result.map((r) => ({ label: r.query, query: r.query }))
          : [],
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isTrending = (trending?.length ?? 0) > 0;
  const promptChips = isTrending ? trending! : QUICK_PROMPTS;

  // Goes straight to the AI-mode results page with the query pre-filled and
  // already running, as if the student had typed and searched it themselves —
  // not the old plain-text /ask page, which has no AI Overview or citations.
  const handlePromptClick = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-12 md:pt-14 md:pb-16 border-b border-border/60 bg-gradient-to-b from-muted/30 via-background to-background">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-12 right-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* SRM-AP Campus Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-4 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The All-in-One Student Ecosystem for SRM AP</span>
          </div>

          {/* Core Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5.5xl font-extrabold tracking-tight text-foreground mb-3.5 text-balance">
            Ask{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-300 dark:to-violet-400 bg-clip-text text-transparent">
              CampusMind
            </span>{" "}
            anything about SRM AP.
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-7 text-balance font-normal leading-relaxed">
            One search that actually gets it — find peer mentors, faculty, hackathon teammates, and groups by describing what you need.
          </p>

          {/* Central CampusMind Search */}
          <div className="max-w-2xl mx-auto mb-4 sm:mb-5">
            <AskBox />
          </div>

          {/* Clickable Quick Prompts — real trending queries once there are enough, curated examples until then */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-8">
            <span className="text-xs text-muted-foreground/80 font-medium mr-1 hidden sm:inline">
              {isTrending ? "🔥 Trending now:" : "Try asking:"}
            </span>
            {promptChips.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePromptClick(p.query)}
                className="inline-flex max-w-[15rem] items-center truncate text-xs px-3 py-1.5 rounded-full bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border/80 text-muted-foreground transition-all duration-200 cursor-pointer shadow-2xs font-medium"
              >
                <span className="truncate">{p.label}</span>
              </button>
            ))}
          </div>

          {/* Live Campus Momentum Metrics Capsules */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-3 max-w-4xl mx-auto pt-2">
            <Link
              to="/faculty"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-card/80 border border-border/70 hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-xs text-muted-foreground hover:text-foreground shadow-2xs group"
            >
              <GraduationCap className="h-4 w-4 text-rose-500 shrink-0" />
              <span className="font-bold text-foreground">
                {stats ? stats.faculty : <span className="inline-block h-3.5 w-6 animate-pulse rounded bg-muted/60 align-middle" />}
              </span>
              <span className="text-[11.5px]">Faculty</span>
            </Link>

            <Link
              to="/workspace-groups"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-card/80 border border-border/70 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-xs text-muted-foreground hover:text-foreground shadow-2xs group"
            >
              <Users className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-bold text-foreground">
                {stats ? stats.groups : <span className="inline-block h-3.5 w-6 animate-pulse rounded bg-muted/60 align-middle" />}
              </span>
              <span className="text-[11.5px]">Active Groups</span>
            </Link>

            <Link
              to="/mentors"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-card/80 border border-border/70 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-xs text-muted-foreground hover:text-foreground shadow-2xs group"
            >
              <Building2 className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="font-bold text-foreground">
                {stats ? stats.mentors : <span className="inline-block h-3.5 w-6 animate-pulse rounded bg-muted/60 align-middle" />}
              </span>
              <span className="text-[11.5px]">Student Mentors</span>
            </Link>

            <Link
              to="/posts"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-card/80 border border-border/70 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-xs text-muted-foreground hover:text-foreground shadow-2xs group"
            >
              <MessageSquare className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="font-bold text-foreground">
                {stats ? stats.posts : <span className="inline-block h-3.5 w-6 animate-pulse rounded bg-muted/60 align-middle" />}
              </span>
              <span className="text-[11.5px]">Campus Posts</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
