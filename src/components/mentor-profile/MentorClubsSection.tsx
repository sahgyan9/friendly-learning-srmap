import { useEffect, useState } from "react";
import { Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getUserJoinedCommunities, UserJoinedCommunity } from "@/integrations/supabase/services/communities";

interface MentorClubsSectionProps {
  userId: string;
  isOwnProfile?: boolean;
}

export default function MentorClubsSection({ userId, isOwnProfile }: MentorClubsSectionProps) {
  const [clubs, setClubs] = useState<UserJoinedCommunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getUserJoinedCommunities(userId).then((res) => {
      if (!cancelled) {
        setClubs(res);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return null;

  if (clubs.length === 0) {
    if (!isOwnProfile) return null;

    return (
      <section className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Users className="h-5 w-5 text-muted-foreground" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">No clubs yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Clubs you join on the site are listed here, so students can see which societies you are part of.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/communities?kind=club">
            Browse clubs
            <ArrowRight />
          </Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Clubs and societies</h2>
        {isOwnProfile && (
          <Link
            to="/communities"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Manage
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {clubs.map(({ community, role }) => (
          <Link
            key={community.id}
            to={`/community/${community.slug}`}
            className="group flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border p-3 transition-colors duration-150 hover:border-foreground/20 hover:bg-accent/50"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground">
                {community.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
                  {community.name}
                </p>
                <p className="text-xs capitalize text-muted-foreground">
                  {community.kind === "club" ? "Club" : community.kind}
                </p>
              </div>
            </div>

            <span
              className={`shrink-0 text-xs capitalize ${
                role === "owner" || role === "lead" ? "font-medium text-foreground" : "text-muted-foreground"
              }`}
            >
              {role}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
