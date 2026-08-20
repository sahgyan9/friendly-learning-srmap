import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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

const INTEREST_TAGS = [
  { id: "all", label: "✨ All Recommendations", query: "" },
  { id: "hackathon", label: "⚡ SIH & Hackathons", query: "hackathon" },
  { id: "dsa", label: "💻 DSA & Placements", query: "dsa" },
  { id: "ai", label: "🤖 AI & Machine Learning", query: "ai" },
  { id: "web", label: "🌐 Web & Full Stack", query: "web" },
  { id: "robotics", label: "🦾 Robotics & Hardware", query: "robotics" },
  { id: "study", label: "📚 Study & Exams", query: "study" },
  { id: "club", label: "🎭 Clubs & Culture", query: "club" },
];

export function CommunityOnboardingHero({
  communities,
  onMembershipChange,
  onExploreAll,
  onStartGroup,
}: CommunityOnboardingHeroProps) {
  const { user } = useAuth();
  const [selectedTag, setSelectedTag] = useState<string>("all");

  const filteredCommunities = React.useMemo(() => {
    if (selectedTag === "all") {
      return communities.slice(0, 6);
    }
    const tag = INTEREST_TAGS.find((t) => t.id === selectedTag);
    if (!tag) return communities.slice(0, 6);

    const q = tag.query.toLowerCase();
    const matched = communities.filter(
      (c) =>
        c.kind.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );

    return matched.length > 0 ? matched.slice(0, 6) : communities.slice(0, 6);
  }, [communities, selectedTag]);

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
          Whether you're gearing up for your first hackathon, preparing for DSA interviews,
          joining a robotics lab, or starting a study room—discover student groups built for you.
        </p>

        {/* Quick Interest Tags */}
        <div className="pt-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
            Select what you are looking for:
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
              Recommended Starter Communities ({filteredCommunities.length})
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCommunities.map((community) => (
            <CommunityCard
              key={community.id}
              community={community}
              onMembershipChange={onMembershipChange}
            />
          ))}
        </div>

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
