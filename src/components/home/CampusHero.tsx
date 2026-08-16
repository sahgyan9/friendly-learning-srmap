import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Users, GraduationCap, Building2, MessageSquare } from "lucide-react";
import AskBox from "@/components/search/AskBox";
import { getPlatformStats, type PlatformStats } from "@/integrations/supabase/services/platform-stats";

const QUICK_PROMPTS = [
  { label: "🤖 AI & ML Mentors", query: "Who knows AI and machine learning for a project?" },
  { label: "💻 DSA & Coding help", query: "Senior mentors for Data Structures and Algorithms" },
  { label: "🚀 Hackathon teammates", query: "Looking for teammates for hackathon web development" },
  { label: "👨‍🏫 Rate or find faculty", query: "Faculty researching computer vision and deep learning" },
];

export const CampusHero = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformStats().then((result) => {
      if (!cancelled) setStats(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePromptClick = (query: string) => {
    navigate(`/ask?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-10 md:pt-12 md:pb-14 border-b border-border/60 bg-gradient-to-b from-muted/40 via-background to-background">
      {/* Decorative ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-60" />
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          {/* SRM-AP Campus Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium mb-4 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>The All-in-One SRM University-AP Student Platform</span>
          </div>

          {/* Core Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3 text-balance">
            Your campus,{" "}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
              connected in one place.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 text-balance">
            Post ideas, find hackathon teammates, search with CampusMind, rate faculty, and get mentored by seniors.
          </p>

          {/* Central CampusMind Search */}
          <div className="max-w-2xl mx-auto mb-4">
            <AskBox />
          </div>

          {/* Clickable Quick Prompts */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mb-6">
            <span className="text-xs text-muted-foreground font-medium mr-1 hidden sm:inline">Try asking:</span>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePromptClick(p.query)}
                className="inline-flex items-center text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-border/80 text-muted-foreground transition-all duration-200 cursor-pointer shadow-2xs"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-2 text-xs sm:text-sm text-muted-foreground border-t border-border/40 max-w-3xl mx-auto">
            <Link
              to="/faculty"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
            >
              <GraduationCap className="h-4 w-4 text-rose-500" />
              {stats ? (
                <span className="font-semibold text-foreground">{stats.faculty}</span>
              ) : (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-muted/60 align-middle" />
              )} Faculty Rated
            </Link>
            <span className="text-border">•</span>
            <Link
              to="/workspace-groups"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
            >
              <Users className="h-4 w-4 text-amber-500" />
              {stats ? (
                <span className="font-semibold text-foreground">{stats.groups}</span>
              ) : (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-muted/60 align-middle" />
              )} Active Groups
            </Link>
            <span className="text-border">•</span>
            <Link
              to="/mentors"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
            >
              <Building2 className="h-4 w-4 text-blue-500" />
              {stats ? (
                <span className="font-semibold text-foreground">{stats.mentors}</span>
              ) : (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-muted/60 align-middle" />
              )} Student Mentors
            </Link>
            <span className="text-border">•</span>
            <Link
              to="/posts"
              className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
            >
              <MessageSquare className="h-4 w-4 text-emerald-500" />
              {stats ? (
                <span className="font-semibold text-foreground">{stats.posts}</span>
              ) : (
                <span className="inline-block h-4 w-6 animate-pulse rounded bg-muted/60 align-middle" />
              )} Campus Posts
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
