import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Users, MessageCircle, Linkedin, Loader2, GraduationCap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mentor } from "@/types/mentor";
import BadgeGrid from "@/components/badges/BadgeGrid";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { useBadges } from "@/hooks/useBadges";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { getMentorById, isMentorListed } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { formatDepartment } from "@/utils/user-utils";
import { CardAccentBorder } from "@/components/ui/CardAccentBorder";

interface MentorCardProps {
  mentor: Mentor;
}

const MentorCard = ({ mentor }: MentorCardProps) => {
  const { getUserBadges } = useBadges();
  const userBadges = getUserBadges(mentor.id);
  const { user } = useAuth();
  const [isNavigating, setIsNavigating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const navigate = useNavigate();

  // Paused mentors are filtered out of the directory query, so this only shows
  // in the places they still surface: their own view of themselves, and any
  // cached or directly linked list.
  const listed = isMentorListed(mentor);

  const handleConnect = async () => {
    if (!user) {
      toast.error("Please sign in to connect with mentors");
      return;
    }
    
    setIsConnecting(true);
    
    try {
      console.log('Starting connection process with mentor:', mentor.id);
      
      // Check if user is trying to message themselves
      if (mentor.id === user.id) {
        toast.error("You cannot message yourself");
        return;
      }
      
      // First verify the mentor exists and get fresh data
      const { data: mentorData, error: mentorError } = await getMentorById(mentor.id);
      
      if (mentorError || !mentorData) {
        console.error('Failed to fetch mentor data:', mentorError);
        toast.error("Failed to load mentor information");
        return;
      }
      
      console.log('Mentor data verified:', mentorData.name);
      
      // Create or get the conversation
      const { data: conversation, error: conversationError } = await getOrCreateConversation(user.id, mentor.id);
      
      if (conversationError || !conversation) {
        console.error('Failed to create/get conversation:', conversationError);
        toast.error("Failed to start conversation with mentor");
        return;
      }
      
      console.log('Conversation established:', conversation.id);
      
      // Show success message
      toast.success(`Connected with ${mentor.name}. Redirecting to messages...`);
      
      // Navigate to messages page with the conversation ID
      navigate(`/messages?chat=${conversation.id}`);
      
    } catch (err) {
      console.error('Error during connection process:', err);
      toast.error("An error occurred while connecting to the mentor");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCardClick = async () => {
    setIsNavigating(true);
    // Add a small delay to show loading state
    setTimeout(() => {
      navigate(`/mentor/${mentor.id}`);
    }, 100);
  };

  return (
    <div className="relative group h-full">
      <Card
        className="group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 cursor-pointer"
        onClick={handleCardClick}
      >
        {/* Solid full-width accent border — same pattern as portfolio-insight */}
        <CardAccentBorder gradient="primary" />

        {/* Hover glow — matches FeaturesShowcase card hover pattern */}
        <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent" />

        {/* Loading overlay */}
        {isNavigating && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        <CardContent className="relative z-10 flex flex-col h-full p-5">
          {/* Header — avatar + name + meta */}
          <div className="mb-4 flex items-start gap-3">
            <MentorAvatar
              name={mentor.name}
              src={mentor.profile_image}
              seed={mentor.id}
              className="h-14 w-14 flex-shrink-0 ring-2 ring-primary/20"
              fallbackClassName="text-base"
            />

            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-base font-semibold leading-tight transition-colors group-hover:text-primary">
                {mentor.name}
              </h3>

              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex min-w-0 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm text-muted-foreground">
                    {formatDepartment(mentor.department)}
                  </span>
                </div>
                {mentor.linkedin_url && (
                  <a
                    href={mentor.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${mentor.name} on LinkedIn`}
                    className="flex-shrink-0 text-primary/60 transition-colors hover:text-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
              </div>

              {/* Status + rating row */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {/* The whole point of the alumni transition: a student scanning
                    this list can tell who has already been through placements.
                    Company beats cohort year when we have it — "at Google" is
                    what makes someone worth asking. */}
                {mentor.is_alumni && (
                  <Badge
                    variant="secondary"
                    className="gap-1 bg-primary/10 text-xs text-primary border-primary/20"
                  >
                    <GraduationCap className="h-3 w-3" />
                    Alumni
                    {mentor.graduation_year ? ` '${String(mentor.graduation_year).slice(-2)}` : ""}
                  </Badge>
                )}

                {/* Neutral on purpose. Taking a break is a choice, not a
                    fault, and a red or amber chip would read as a warning about
                    the person. */}
                {!listed && (
                  <Badge
                    variant="secondary"
                    className="bg-muted text-xs text-muted-foreground"
                  >
                    Taking a break
                  </Badge>
                )}

                {mentor.review_count === 0 || mentor.rating === 0 ? (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  >
                    New Mentor
                  </Badge>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold text-foreground">
                      {mentor.rating.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({mentor.review_count})
                    </span>
                  </span>
                )}

                {mentor.is_alumni && (mentor.company || mentor.job_title) && (
                  <span className="w-full truncate text-xs text-muted-foreground">
                    {[mentor.job_title, mentor.company].filter(Boolean).join(" at ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mb-4 flex-grow">
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {mentor.bio}
            </p>
          </div>

          {/* Skills */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5">
              {mentor.skills.slice(0, 3).map((skill, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors"
                >
                  {skill}
                </Badge>
              ))}
              {mentor.skills.length > 3 && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  +{mentor.skills.length - 3}
                </Badge>
              )}
            </div>
          </div>

          {/* Achievement badges */}
          {userBadges.length > 0 && (
            <div className="mb-4">
              <BadgeGrid badges={userBadges} maxDisplay={3} />
            </div>
          )}

          {/* Footer */}
          <div className="mt-auto border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                <span>
                  {mentor.review_count === 0 ? "No reviews yet" : `${mentor.review_count} reviews`}
                </span>
              </div>

              {/* The card stays clickable through to the profile even when
                  paused — you can still read about someone you cannot message
                  yet. Only the action is withdrawn. */}
              <Button
                size="sm"
                className="h-8 gap-1.5 px-3 text-xs group-hover:gap-2.5 transition-all duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnect();
                }}
                disabled={isConnecting || !listed}
              >
                {isConnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageCircle className="h-3.5 w-3.5" />
                )}
                {!listed ? "Unavailable" : isConnecting ? "Connecting..." : "Connect"}
                {listed && !isConnecting && (
                  <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorCard;
