import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users } from "lucide-react";

import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityCard } from "@/components/communities/CommunityCard";
import { CreateCommunityModal } from "@/components/communities/CreateCommunityModal";
import MyInvites from "@/components/communities/MyInvites";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import {
  COMMUNITY_KINDS,
  listCommunities,
  type Community,
} from "@/integrations/supabase/services/communities";

const Communities = () => {
  const { user, isMentor } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("all");
  const [mine, setMine] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await listCommunities({ search: debouncedSearch, kind, mine });
    setCommunities(data);
    setLoading(false);
  }, [debouncedSearch, kind, mine]);

  useEffect(() => {
    load();
  }, [load]);

  const filtering = debouncedSearch.trim().length > 0 || kind !== "all" || mine;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Groups | Friendly Learning"
        description="Hackathon teams, project groups, clubs and study circles started by mentors at SRM AP."
      />

      <div className="container mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold md:text-4xl">Groups</h1>
            <p className="max-w-2xl text-muted-foreground">
              Hackathon teams, project groups, clubs and study circles. A mentor starts one, and
              members post inside it — some are open to everyone, some you ask to join.
            </p>
          </div>

          {isMentor && (
            <Button onClick={() => setCreateOpen(true)} size="lg" className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              Start a group
            </Button>
          )}
        </div>

        <MyInvites />

        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search groups"
              className="pl-9"
              aria-label="Search groups"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setKind("all")}
              aria-pressed={kind === "all"}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                kind === "all"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-muted",
              )}
            >
              All groups
            </button>

            {COMMUNITY_KINDS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                aria-pressed={kind === option.value}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  kind === option.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                <span aria-hidden>{option.emoji}</span>
                {option.label}
              </button>
            ))}

            {user && (
              <button
                type="button"
                onClick={() => setMine((value) => !value)}
                aria-pressed={mine}
                className={cn(
                  "ml-auto rounded-full border px-3 py-1.5 text-sm transition-colors",
                  mine
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                Only mine
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-52 w-full rounded-xl" />
            ))}
          </div>
        ) : communities.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </span>

              {filtering ? (
                <>
                  <p className="font-medium">No groups match that</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Try a different kind, or clear the search.
                  </p>
                </>
              ) : isMentor ? (
                <>
                  <p className="font-medium">No groups yet — start the first one</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    A hackathon team, a club, a study circle. You'll own it, and students can join
                    from the link.
                  </p>
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Start a group
                  </Button>
                </>
              ) : (
                <>
                  <p className="font-medium">No groups yet</p>
                  <p className="max-w-md text-sm text-muted-foreground">
                    Mentors start the groups here. Become one and you can run your own — a hackathon
                    team, a club, or a study circle.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/become-mentor">Become a mentor</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {isMentor && <CreateCommunityModal open={createOpen} onOpenChange={setCreateOpen} />}
    </div>
  );
};

export default Communities;
