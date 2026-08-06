import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Globe,
  Hand,
  MapPin,
  MessageCircle,
  Plus,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import {
  createTeam,
  daysLeft,
  getMyInterest,
  getOpportunityBySlug,
  getTeams,
  setInterest,
  withdrawInterest,
  type Opportunity,
  type OpportunityTeam,
} from "@/integrations/supabase/services/opportunities";

const OpportunityDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [teams, setTeams] = useState<OpportunityTeam[]>([]);
  const [interested, setInterested] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamPitch, setTeamPitch] = useState("");
  const [teamLookingFor, setTeamLookingFor] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);

    const { data } = await getOpportunityBySlug(slug);
    setOpportunity(data);

    if (data) {
      const [{ data: teamRows }, { data: mine }] = await Promise.all([
        getTeams(data.id),
        getMyInterest(data.id),
      ]);
      setTeams(teamRows);
      setInterested(Boolean(mine));
    }

    setLoading(false);
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleInterest = async () => {
    if (!opportunity) return;
    if (!user) {
      toast.error("Sign in to show interest");
      return;
    }

    setBusy(true);
    const { error } = interested
      ? await withdrawInterest(opportunity.id)
      : await setInterest(opportunity.id);

    if (error) toast.error(error.message);
    else {
      setInterested(!interested);
      // Reload rather than adjust locally: interest_count is maintained by a
      // trigger, so the server is the only place that knows the new number.
      await load();
    }
    setBusy(false);
  };

  const submitTeam = async () => {
    if (!opportunity) return;
    if (teamName.trim().length < 3) {
      toast.error("Give the team a name of at least 3 characters");
      return;
    }

    setBusy(true);
    const { data, error } = await createTeam({
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      name: teamName,
      pitch: teamPitch,
      lookingFor: teamLookingFor
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    setBusy(false);

    if (error || !data) {
      toast.error(error?.message ?? "Could not create the team");
      return;
    }

    toast.success("Team created — your group chat is ready");
    setShowTeamDialog(false);
    setTeamName("");
    setTeamPitch("");
    setTeamLookingFor("");
    await load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 pt-28">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3" />
          <Skeleton className="mt-6 h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 pt-28 text-center">
          <h1 className="text-2xl font-bold">Opportunity not found</h1>
          <p className="mt-2 text-muted-foreground">It may have closed or been removed.</p>
          <Button asChild className="mt-4">
            <Link to="/opportunities">See what's open</Link>
          </Button>
        </div>
      </div>
    );
  }

  const days = daysLeft(opportunity.register_by);
  const openTeams = teams.filter((team) => team.is_open);

  return (
    <>
      <SEOHead
        title={`${opportunity.title} | Find a Team at SRM AP`}
        description={
          opportunity.description?.slice(0, 155) ??
          `${opportunity.title} — see who from SRM University-AP is entering, and form a team.`
        }
        canonical={`${PRIMARY_DOMAIN}/opportunities/${opportunity.slug}`}
      />

      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-3xl px-4 pb-12 pt-24">
          <Link
            to="/opportunities"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            All opportunities
          </Link>

          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold leading-tight">{opportunity.title}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {opportunity.organiser && <span>{opportunity.organiser}</span>}
                  <span className="inline-flex items-center gap-1">
                    {opportunity.is_online ? <Globe className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                    {opportunity.is_online ? "Online" : opportunity.location ?? "On campus"}
                  </span>
                  {(opportunity.team_min || opportunity.team_max) && (
                    <span>
                      Teams of {opportunity.team_min ?? 1}–{opportunity.team_max ?? "?"}
                    </span>
                  )}
                </p>
              </div>
              <span className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium uppercase tracking-wide">
                {opportunity.kind}
              </span>
            </div>

            {opportunity.register_by && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                {days !== null && days <= 0
                  ? "Registration closes today"
                  : `${days} days left to register`}
                <span className="text-muted-foreground">
                  · {new Date(opportunity.register_by).toLocaleDateString()}
                </span>
              </p>
            )}

            {opportunity.description && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {opportunity.description}
              </p>
            )}

            {opportunity.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {opportunity.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-border bg-muted/50 px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={toggleInterest} disabled={busy} variant={interested ? "outline" : "default"}>
                <Hand className="mr-1.5 h-4 w-4" />
                {interested ? "You're interested" : "I'm interested"}
              </Button>

              {opportunity.external_url && (
                <Button asChild variant="outline">
                  <a href={opportunity.external_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Register on {opportunity.organiser ?? "the organiser's site"}
                  </a>
                </Button>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              <span className="tabular-nums font-medium text-foreground">
                {opportunity.interest_count}
              </span>{" "}
              {opportunity.interest_count === 1 ? "person is" : "people are"} interested. Showing
              interest is not registration — it just makes you findable to people forming teams.
            </p>
          </Card>

          <section className="mt-8">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Users className="h-4 w-4" />
                Teams {teams.length > 0 && `(${openTeams.length} looking for members)`}
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => (user ? setShowTeamDialog(true) : toast.error("Sign in to start a team"))}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Start a team
              </Button>
            </div>

            {teams.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center">
                <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                  No teams yet. Starting one creates a private group chat, and anyone who's
                  interested can see what skills you're looking for.
                </p>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {teams.map((team) => (
                  <Card key={team.id} className="flex flex-col gap-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold leading-tight">
                        {team.community?.name ?? "Team"}
                      </span>
                      <span
                        className={
                          team.is_open
                            ? "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400"
                            : "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                        }
                      >
                        {team.is_open ? "Open" : "Full"}
                      </span>
                    </div>

                    {team.pitch && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">{team.pitch}</p>
                    )}

                    {team.looking_for.length > 0 && team.is_open && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[10px] text-muted-foreground">Needs:</span>
                        {team.looking_for.map((skill) => (
                          <span
                            key={skill}
                            className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] text-primary"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto flex items-center justify-between pt-1">
                      <span className="text-[11px] tabular-nums text-muted-foreground">
                        {team.community?.member_count ?? 1} member
                        {(team.community?.member_count ?? 1) === 1 ? "" : "s"}
                      </span>
                      {team.community?.slug && (
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                          <Link to={`/communities/${team.community.slug}`}>
                            <MessageCircle className="mr-1 h-3 w-3" />
                            Open chat
                          </Link>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>

        <Footer />
      </div>

      <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a team</DialogTitle>
            <DialogDescription>
              This creates a private group with its own chat. You can invite people, and anyone
              interested in {opportunity.title} will see what you're looking for.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="team-name">
                Team name
              </label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder="Night Shift"
                maxLength={80}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="team-pitch">
                What are you building?
              </label>
              <Textarea
                id="team-pitch"
                value={teamPitch}
                onChange={(event) => setTeamPitch(event.target.value)}
                placeholder="A vision model that maps step-free routes around campus."
                rows={3}
                maxLength={300}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="team-needs">
                Skills you still need
              </label>
              <Input
                id="team-needs"
                value={teamLookingFor}
                onChange={(event) => setTeamLookingFor(event.target.value)}
                placeholder="UI/UX, Frontend, Pitching"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Separate with commas. This is what makes your team findable.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTeamDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitTeam} disabled={busy}>
              {busy ? "Creating..." : "Create team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OpportunityDetail;
