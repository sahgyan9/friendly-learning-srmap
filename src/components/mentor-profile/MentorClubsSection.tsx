import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Drama, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl border border-dashed border-border/80 bg-card/60 p-6 text-center"
      >
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-3">
          <Drama className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold text-foreground">Clubs & Student Societies</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1 mb-4">
          You haven't joined any campus clubs or workspace groups yet. Join Next Tech Lab, Ennovab, GDG, or other societies to display your club badges here!
        </p>
        <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-medium">
          <Link to="/communities?kind=club">
            Explore Campus Clubs
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Drama className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Clubs & Student Societies</h2>
            <p className="text-xs text-muted-foreground">Active affiliations at SRM AP</p>
          </div>
        </div>

        {isOwnProfile && (
          <Button asChild variant="ghost" size="sm" className="text-xs text-primary gap-1">
            <Link to="/communities">
              Manage Groups
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {clubs.map(({ community, role }) => (
          <Link
            key={community.id}
            to={`/community/${community.slug}`}
            className="group flex items-center justify-between p-3 rounded-xl border border-border/70 bg-background hover:bg-muted/50 hover:border-purple-500/30 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                {community.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {community.name}
                </p>
                <p className="text-[11px] text-muted-foreground capitalize">
                  {community.kind === "club" ? "Club / Society" : community.kind}
                </p>
              </div>
            </div>

            <Badge
              variant="outline"
              className={`text-[10px] capitalize shrink-0 ml-2 ${
                role === "owner" || role === "lead"
                  ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 font-semibold"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {role}
            </Badge>
          </Link>
        ))}
      </div>
    </motion.div>
  );
}
