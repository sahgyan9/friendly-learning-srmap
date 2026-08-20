import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Compass, Plus, Sparkles, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityCard } from "@/components/communities/CommunityCard";
import type { Community } from "@/integrations/supabase/services/communities";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface CommunityOnboardingHeroProps {
  communities: Community[];
  onMembershipChange: (id: string, patch: Partial<Community>) => void;
  onExploreAll: () => void;
  onStartGroup: () => void;
}

interface InterestFilter {
  id: string;
  label: string;
  categoryName: string;
  kinds?: string[];
  keywords?: string[];
}

const INTEREST_TAGS: InterestFilter[] = [
  {
    id: "all",
    label: "✨ All Recommendations",
    categoryName: "Starter",
  },
  {
    id: "hackathons",
    label: "⚡ Hackathons & SIH",
    categoryName: "Hackathon & SIH",
    kinds: ["hackathon", "project"],
    keywords: ["hackathon", "hackthon", "sih", "teammate", "team", "competition", "dev"],
  },
  {
    id: "dev-tech",
    label: "💻 Tech & Dev Projects",
    categoryName: "Tech & Coding",
    kinds: ["hackathon", "project", "research"],
    keywords: [
      "mern",
      "react",
      "ai/ml",
      "ml",
      "ai",
      "dsa",
      "code",
      "coding",
      "web",
      "python",
      "backend",
      "frontend",
      "fullstack",
      "technology",
      "software",
    ],
  },
  {
    id: "study-research",
    label: "📚 Study & Research",
    categoryName: "Study & Research",
    kinds: ["study", "research"],
    keywords: ["study", "research", "exam", "battery", "technology", "lab", "paper", "prep", "notes", "course"],
  },
  {
    id: "clubs-culture",
    label: "🎭 Clubs & Wellness",
    categoryName: "Clubs & Wellness",
    kinds: ["club", "general"],
    keywords: ["club", "wellness", "health", "mindful", "culture", "music", "dance", "sports", "art", "society"],
  },
];

export function CommunityOnboardingHero({
  communities,
  onMembershipChange,
  onExploreAll,
  onStartGroup,
}: CommunityOnboardingHeroProps) {
  const { user } = useAuth();
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const currentTag = useMemo(() => {
    return INTEREST_TAGS.find((t) => t.id === selectedTag) || INTEREST_TAGS[0];
  }, [selectedTag]);

  const filteredCommunities = useMemo(() => {
    if (selectedTag === "all") {
      return communities.slice(0, 6);
    }

    const tag = currentTag;
    return communities.filter((c) => {
      const kindMatch = tag.kinds?.includes(c.kind.toLowerCase());
      const textToSearch = `${c.name} ${c.description || ""}`.toLowerCase();
      const keywordMatch = tag.keywords?.some((kw) => textToSearch.includes(kw.toLowerCase()));
      return Boolean(kindMatch || keywordMatch);
    });
  }, [communities, selectedTag, currentTag]);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-background to-background p-6 md:p-10 shadow-sm mb-10">
      {/* Decorative ambient glows */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-52 w-52 rounded-full bg-amber-500/10 blur-2xl" />

      <div className="relative z-10 max-w-3xl space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5" />
          First-Time Community Guide
        </div>

        <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Find your people at SRM AP.
        </h2>

        <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
          Whether you're gearing up for your first hackathon, preparing for interviews,
          joining a research lab, or starting a study room—discover student groups built for you.
        </p>

        {/* Quick Interest Tags */}
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Filter by your interest:
          </p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => {
              const active = selectedTag === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setSelectedTag(tag.id)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 shadow-2xs",
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs scale-105"
                      : "border border-border/80 bg-card/80 text-muted-foreground hover:bg-accent hover:text-foreground hover:border-primary/40",
                  )}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recommended Starter Cards */}
      <div className="relative z-10 mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {currentTag.categoryName} Communities ({filteredCommunities.length})
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onExploreAll}
            className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1"
          >
            <span>Browse all categories</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {filteredCommunities.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCommunities.map((community) => (
              <CommunityCard
                key={community.id}
                community={community}
                onMembershipChange={onMembershipChange}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-8 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">
              No {currentTag.categoryName.toLowerCase()} communities found yet.
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Be the first to start a group for your batch, hackathon team, or study circle!
            </p>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <Button size="sm" onClick={onStartGroup} className="gap-1.5 font-semibold text-xs">
                <Plus className="h-3.5 w-3.5" />
                Start {currentTag.categoryName} group
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedTag("all")} className="text-xs">
                Show all communities
              </Button>
            </div>
          </div>
        )}

        {/* Footer CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Zap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Want to start your own crew?</p>
              <p className="text-xs text-muted-foreground">
                Create a study room, hackathon team, or lab circle in under 30 seconds.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {user ? (
              <Button onClick={onStartGroup} size="sm" className="w-full sm:w-auto gap-1.5">
                <Plus className="h-4 w-4" />
                Start a group
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                <Link to="/signin">Sign in to start a group</Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onExploreAll}
              className="w-full sm:w-auto gap-1.5"
            >
              <Compass className="h-4 w-4" />
              Discover all
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommunityOnboardingHero;
