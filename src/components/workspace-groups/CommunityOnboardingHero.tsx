import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Code, Compass, LayoutGrid, Palette, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityCard } from "@/components/workspace-groups/CommunityCard";
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
  icon: React.ComponentType<{ className?: string }>;
  kinds?: string[];
  keywords?: string[];
}

const INTEREST_TAGS: InterestFilter[] = [
  {
    id: "all",
    label: "All",
    categoryName: "Suggested",
    icon: LayoutGrid,
  },
  {
    id: "hackathons",
    label: "Hackathons & SIH",
    categoryName: "Hackathon & SIH",
    icon: Trophy,
    kinds: ["hackathon", "project"],
    keywords: ["hackathon", "hackthon", "sih", "teammate", "team", "competition", "dev"],
  },
  {
    id: "dev-tech",
    label: "Tech & Dev Projects",
    categoryName: "Tech & Coding",
    icon: Code,
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
    label: "Study & Research",
    categoryName: "Study & Research",
    icon: BookOpen,
    kinds: ["study", "research"],
    keywords: ["study", "research", "exam", "battery", "technology", "lab", "paper", "prep", "notes", "course"],
  },
  {
    id: "clubs-culture",
    label: "Clubs & Wellness",
    categoryName: "Clubs & Wellness",
    icon: Palette,
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
    <section aria-labelledby="community-onboarding" className="mb-10 rounded-xl border bg-card p-6 shadow-card md:p-8">
      <div className="max-w-3xl">
        <h2 id="community-onboarding" className="text-2xl font-semibold tracking-tight text-foreground">
          Find a group to join
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Hackathon teams, interview prep, research labs and study rooms. Pick an interest to narrow the list.
        </p>

        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by interest">
          {INTEREST_TAGS.map((tag) => {
            const active = selectedTag === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedTag(tag.id)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors duration-150",
                  active
                    ? "border-primary bg-primary/10 font-medium text-primary"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <tag.icon className="h-4 w-4" />
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium text-foreground">
            {currentTag.categoryName} communities{" "}
            <span className="tabular font-normal text-muted-foreground">{filteredCommunities.length}</span>
          </h3>

          <Button variant="ghost" size="sm" onClick={onExploreAll}>
            Browse all
            <ArrowRight className="h-4 w-4" />
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
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
            <div>
              <p className="text-sm font-medium text-foreground">
                No {currentTag.categoryName.toLowerCase()} communities yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Start one for your batch, hackathon team or study circle.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button size="sm" onClick={onStartGroup}>
                <Plus className="h-4 w-4" />
                Start a group
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedTag("all")}>
                Show all communities
              </Button>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-foreground">Start your own group</p>
            <p className="text-sm text-muted-foreground">
              A study room, hackathon team or lab circle takes under a minute to set up.
            </p>
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            {user ? (
              <Button onClick={onStartGroup} className="flex-1 sm:flex-none">
                <Plus className="h-4 w-4" />
                Start a group
              </Button>
            ) : (
              <Button asChild variant="outline" className="flex-1 sm:flex-none">
                <Link to="/signin">Sign in to start a group</Link>
              </Button>
            )}
            <Button variant="ghost" onClick={onExploreAll} className="flex-1 sm:flex-none">
              <Compass className="h-4 w-4" />
              Discover
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CommunityOnboardingHero;
