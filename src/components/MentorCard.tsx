import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, MessageCircle, Linkedin, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import BadgeGrid from "@/components/badges/BadgeGrid";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { useBadges } from "@/hooks/useBadges";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getMentorById, isMentorListed } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { getUserJoinedCommunities } from "@/integrations/supabase/services/communities";
import { formatDepartment } from "@/utils/user-utils";

interface MentorCardProps {
  mentor: Mentor;
}

/** Three chips fit one line at the narrowest grid width; the rest are on the profile. */
const MAX_SKILLS = 3;

const clubsCache = new Map<string, string[]>();

export const MentorCard = ({ mentor }: MentorCardProps) => {
  const { getUserBadges } = useBadges();
  const userBadges = getUserBadges(mentor.id);
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const [userClubs, setUserClubs] = useState<string[]>(() => clubsCache.get(mentor.id) || []);
  const navigate = useNavigate();

  // Paused mentors are filtered out of the directory query, so this only shows
  // in the places they still surface: their own view of themselves, and any
  // cached or directly linked list.
  const listed = isMentorListed(mentor);

  useEffect(() => {
    if (clubsCache.has(mentor.id)) {
      setUserClubs(clubsCache.get(mentor.id)!);
      return;
    }

    let cancelled = false;
    getUserJoinedCommunities(mentor.id).then((res) => {
      if (!cancelled) {
        const clubNames = res
          .filter((c) => c.community.kind === "club")
          .map((c) => c.community.name);
        clubsCache.set(mentor.id, clubNames);
        setUserClubs(clubNames);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [mentor.id]);

  const handleConnect = async () => {
    if (!user) {
      toast.error("Sign in to message mentors.");
      return;
    }

    setIsConnecting(true);

    try {
      if (mentor.id === user.id) {
        toast.error("You cannot message yourself.");
        return;
      }

      // Re-read the mentor so a stale cached card cannot open a conversation
      // with someone who has since been removed.
      const { data: mentorData, error: mentorError } = await getMentorById(mentor.id);

      if (mentorError || !mentorData) {
        console.error('Failed to fetch mentor data:', mentorError);
        toast.error("Could not load this mentor. Try again.");
        return;
      }

      const { data: conversation, error: conversationError } = await getOrCreateConversation(user.id, mentor.id);

      if (conversationError || !conversation) {
        console.error('Failed to create/get conversation:', conversationError);
        toast.error("Could not start the conversation. Try again.");
        return;
      }

      toast.success(`Conversation with ${mentor.name} opened.`);
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      console.error('Error during connection process:', err);
      toast.error("Could not start the conversation. Try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const profileHref = `/mentor/${mentor.slug || mentor.id}`;
  const hasRating = mentor.review_count > 0 && mentor.rating > 0;
  const roleLine = mentor.is_alumni && (mentor.company || mentor.job_title)
    ? [mentor.job_title, mentor.company].filter(Boolean).join(" at ")
    : formatDepartment(mentor.department);
  const extraSkills = mentor.skills.length - MAX_SKILLS;

  return (
    <Card className="group relative flex h-full flex-col transition-colors duration-150 hover:border-foreground/20">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <MentorAvatar
            name={mentor.name}
            src={mentor.profile_image}
            seed={mentor.id}
            className="h-12 w-12 shrink-0"
            fallbackClassName="text-sm"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug">
                {/* Stretched link: the whole card opens the profile, while the
                    LinkedIn icon and Message button sit above it on z-10. */}
                <Link
                  to={profileHref}
                  className="line-clamp-2 transition-colors duration-150 after:absolute after:inset-0 after:rounded-lg after:content-[''] group-hover:text-primary focus-visible:outline-none"
                >
                  {mentor.name}
                </Link>
              </h3>
              {mentor.linkedin_url && (
                <a
                  href={mentor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${mentor.name} on LinkedIn`}
                  className="relative z-10 -m-1.5 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="truncate text-sm text-muted-foreground">{roleLine}</p>

            {(mentor.is_alumni || !listed) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {/* A student scanning the list can tell who has already been
                    through placements. */}
                {mentor.is_alumni && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-2xs font-medium text-primary">
                    <GraduationCap className="h-3 w-3" />
                    Alumni
                    {mentor.graduation_year ? ` '${String(mentor.graduation_year).slice(-2)}` : ""}
                  </span>
                )}
                {/* Neutral on purpose. Taking a break is a choice, not a
                    fault, and a red or amber chip would read as a warning about
                    the person. */}
                {!listed && (
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-2xs font-medium text-muted-foreground">
                    Taking a break
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {mentor.bio || mentor.tagline || "SRM AP student. Ask about courses, projects or campus life."}
        </p>

        {mentor.skills.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {mentor.skills.slice(0, MAX_SKILLS).map((skill, index) => (
              <span
                key={index}
                className="max-w-full truncate rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {skill}
              </span>
            ))}
            {extraSkills > 0 && (
              <span className="text-xs text-muted-foreground tabular">+{extraSkills}</span>
            )}
          </div>
        )}

        {userClubs.length > 0 && (
          <p className="truncate text-xs text-muted-foreground">
            Member of {userClubs.slice(0, 2).join(", ")}
            {userClubs.length > 2 ? ` and ${userClubs.length - 2} more` : ""}
          </p>
        )}

        {userBadges.length > 0 && <BadgeGrid badges={userBadges} maxDisplay={2} />}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        {hasRating ? (
          <span className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
            <span className="font-medium tabular">{mentor.rating.toFixed(1)}</span>
            <span className="text-muted-foreground tabular">
              ({mentor.review_count} {mentor.review_count === 1 ? "review" : "reviews"})
            </span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">New mentor</span>
        )}

        {/* The card stays clickable through to the profile even when paused —
            you can still read about someone you cannot message yet. Only the
            action is withdrawn. */}
        <Button
          size="sm"
          variant="outline"
          className="relative z-10 shrink-0"
          onClick={handleConnect}
          isLoading={isConnecting}
          disabled={isConnecting || !listed}
        >
          {!isConnecting && <MessageCircle />}
          {!listed ? "Unavailable" : "Message"}
        </Button>
      </div>
    </Card>
  );
};

export default MentorCard;
