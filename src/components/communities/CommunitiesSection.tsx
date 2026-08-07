import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityCard } from "@/components/communities/CommunityCard";
import {
  listCommunities,
  type Community,
} from "@/integrations/supabase/services/communities";
import { CreateCommunityModal } from "@/components/communities/CreateCommunityModal";
import { useAuth } from "@/context/AuthContext";

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] },
  }),
};

/**
 * Homepage widget for the Groups feature.
 *
 * Shows the top 6 communities sorted by member count — the strongest social
 * proof for a visitor who hasn't joined anything yet. Previously Groups had
 * zero presence on the landing page; this gives the feature its own anchor
 * moment in the scroll journey (between Posts and Mentors).
 */
export function CommunitiesSection() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Fetch top communities. listCommunities returns them ordered by the RPC's
    // default; we take the first 6 — member_count DESC is what the RPC uses.
    listCommunities({ limit: 6 }).then(({ data }) => {
      if (cancelled) return;
      // Sort client-side by member_count desc to guarantee visual order.
      const sorted = [...(data ?? [])].sort(
        (a, b) => b.member_count - a.member_count,
      );
      setCommunities(sorted.slice(0, 6));
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleMembershipChange = (id: string, patch: Partial<Community>) => {
    setCommunities((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  };

  // Don't render the section until we have data — avoids a flash of empty space.
  if (loading) return null;
  if (communities.length === 0) return null;

  return (
    <section className="py-16 bg-background dark:bg-gray-950/30">
      <div className="container px-4 md:px-6">
        {/* Section header — brand pill pattern (amber accent, §8 brand guidelines).
            The pill is the section's h2. There is no prose heading here on
            purpose: the two buttons say what you can do, and a heading above
            them only delayed reaching them. Keeping the pill as the heading
            leaves the document outline intact for screen readers and search. */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full border border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-400 text-xs font-semibold tracking-widest uppercase"
          >
            <Users className="w-3.5 h-3.5" />
            Groups
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="text-muted-foreground text-base"
          >
            Clubs, subject groups, hackathon teams, project crews — join or start one in 30 seconds.
          </motion.p>
        </div>

        {/* CTAs lead the section: the two things you can do here are stated
            before the examples rather than after them. */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Button asChild size="lg">
            <Link to="/communities">
              Join a group
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>

          {user ? (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setShowCreate(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Start your own
              </Button>

              <CreateCommunityModal
                open={showCreate}
                onOpenChange={setShowCreate}
              />
            </>
          ) : (
            <Button size="lg" variant="outline" asChild>
              <Link to="/signup" className="gap-2">
                <Plus className="h-4 w-4" />
                Start your own
              </Link>
            </Button>
          )}
        </div>

        {/* Community cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {communities.map((community, i) => (
            <motion.div
              key={community.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
            >
              <CommunityCard
                community={community}
                onMembershipChange={handleMembershipChange}
              />
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
