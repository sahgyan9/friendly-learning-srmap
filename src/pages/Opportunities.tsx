import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarClock, Users, Globe, MapPin, Trophy, ExternalLink } from "lucide-react";

import Footer from "@/components/Footer";
import PostOpportunityDialog from "@/components/opportunities/PostOpportunityDialog";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { getBreadcrumbSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  OPPORTUNITY_KINDS,
  daysLeft,
  getOpportunities,
  type Opportunity,
} from "@/integrations/supabase/services/opportunities";

/**
 * The deadline is the whole point of this page, so it is the loudest thing on
 * each card. Colour escalates as it closes — a fresher scanning quickly should
 * feel which ones are about to go.
 */
function Deadline({ registerBy }: { registerBy: string | null }) {
  const days = daysLeft(registerBy);
  if (days === null) return <span className="text-muted-foreground">No deadline listed</span>;

  const tone =
    days <= 3 ? "text-destructive" : days <= 10 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";

  return (
    <span className={cn("font-medium tabular-nums", tone)}>
      {days <= 0 ? "Closes today" : days === 1 ? "1 day left" : `${days} days left`}
    </span>
  );
}

function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <Card className="group flex flex-col gap-2 p-4 transition-colors hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/opportunities/${opportunity.slug}`}
              className="font-semibold leading-tight hover:underline"
            >
              {opportunity.title}
            </Link>
            {opportunity.is_fresh && (
              <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-4xs font-bold uppercase tracking-wider">
                New
              </span>
            )}
          </div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {opportunity.organiser && <span>{opportunity.organiser}</span>}
            <span className="inline-flex items-center gap-1">
              {opportunity.is_online ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
              {opportunity.is_online ? "Online" : opportunity.location ?? "On campus"}
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-3xs font-medium uppercase tracking-wide">
          {opportunity.kind}
        </span>
      </div>

      {opportunity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {opportunity.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="max-w-[14rem] truncate rounded border border-border bg-muted/50 px-1.5 py-0.5 text-3xs"
            >
              {tag}
            </span>
          ))}
          {opportunity.tags.length > 4 && (
            <span className="text-3xs text-muted-foreground">+{opportunity.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          <Deadline registerBy={opportunity.register_by} />
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span className="tabular-nums">{opportunity.interest_count}</span> interested
        </span>
        {opportunity.team_count > 0 && (
          <span className="tabular-nums text-muted-foreground">
            {opportunity.team_count} {opportunity.team_count === 1 ? "team" : "teams"}
          </span>
        )}
      </div>
    </Card>
  );
}

const Opportunities = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const kind = searchParams.get("kind") ?? "all";
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getOpportunities({ kind, search });
    setItems(data);
    setLoading(false);
  }, [kind, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  // Revalidate opportunities on mobile/tablet pull-to-refresh gesture
  useEffect(() => {
    const handlePullRefresh = () => {
      load();
    };
    window.addEventListener("fl:refresh", handlePullRefresh);
    return () => window.removeEventListener("fl:refresh", handlePullRefresh);
  }, [load]);

  const setKind = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "all") next.delete("kind");
    else next.set("kind", value);
    setSearchParams(next, { replace: true });
  };

  const canonical = `${PRIMARY_DOMAIN}/opportunities`;

  return (
    <>
      <SEOHead
        title="Hackathons & Opportunities at SRM AP | Find a Team"
        description="Hackathons, competitions and internships open to SRM University-AP students — and the teammates to enter them with. See who else is interested and form a team."
        keywords="srm ap hackathon, hackathon team srmap, competitions srm university ap, find teammates hackathon"
        canonical={canonical}
      />
      <StructuredData
        data={getBreadcrumbSchema([
          { name: "Home", url: `${PRIMARY_DOMAIN}/` },
          { name: "Opportunities", url: canonical },
        ])}
      />

      <div className="min-h-screen bg-background">
        <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/5 via-background to-background">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="container mx-auto max-w-5xl px-4 pb-8 pt-28">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
              <Trophy className="h-3.5 w-3.5" />
              Opportunities
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Find something to enter — and someone to enter it with.
                </h1>
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                  Hackathons and competitions open to SRM AP students. Register on the organiser's
                  site; find your team here.
                </p>
              </div>

              {/* Anyone signed in can post */}
              {user ? (
                <PostOpportunityDialog onPosted={load} />
              ) : (
                <Button asChild size="sm" variant="outline">
                  <Link to="/signin" state={{ from: { pathname: "/opportunities" } }}>
                    Sign in to post one
                  </Link>
                </Button>
              )}
            </div>

            {/* Search and Filters */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search hackathons by name, organiser, tags (e.g. AI, SIH, Web)…"
                  className="w-full h-10 rounded-xl border border-border/60 bg-card/80 px-3.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setKind("all")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    kind === "all"
                      ? "border-primary/30 bg-primary/10 font-medium text-primary"
                      : "border-border bg-card hover:border-primary/30",
                  )}
                >
                  All
                </button>
                {OPPORTUNITY_KINDS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setKind(option.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      kind === option.value
                        ? "border-primary/30 bg-primary/10 font-medium text-primary"
                        : "border-border bg-card hover:border-primary/30",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl px-4 py-8">
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed py-16 text-center">
              <h2 className="mb-1 text-lg font-semibold">Nothing open right now</h2>
              <p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">
                {kind === "all"
                  ? "When a hackathon or competition opens, it shows up here with the people who want to enter it."
                  : "Nothing in this category is open. Try another."}
              </p>
              {/* An empty listings page is the moment someone is most likely to
                  know of something worth listing, so posting leads here and
                  browsing people is the fallback — not the other way round. */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {user && <PostOpportunityDialog onPosted={load} />}
                <Button asChild variant="outline">
                  <Link to="/ask">Find people to work with instead</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} />
              ))}
            </div>
          )}

          <p className="mt-8 flex items-center gap-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
            <ExternalLink className="h-3 w-3" />
            Registration always happens on the organiser's own site. Friendly Learning helps you
            find the opportunity and the team, not sign up on your behalf.
          </p>
        </div>

        <Footer />
      </div>
    </>
  );
};

export default Opportunities;
