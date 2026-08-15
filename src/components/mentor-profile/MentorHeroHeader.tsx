import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Star,
  Users,
  Zap,
  Clock,
  MessageCircle,
  Linkedin,
  GraduationCap,
  Sparkles,
  Camera,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { useAuth } from "@/context/AuthContext";
import { isMentorListed, getMentorById } from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { toast } from "sonner";
import { formatDepartment } from "@/utils/user-utils";

interface MentorHeroHeaderProps {
  mentor: EnhancedMentor;
  canRate: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
}

export default function MentorHeroHeader({
  mentor,
  canRate,
  ratingLoading,
  onShowRatingModal,
}: MentorHeroHeaderProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const isOwnProfile = Boolean(user && mentor && user.id === mentor.id);

  const handleConnect = async () => {
    if (!user) {
      toast.error("Please sign in to connect with mentors");
      return;
    }

    if (mentor.id === user.id) {
      toast.error("You cannot message yourself");
      return;
    }

    setIsConnecting(true);

    try {
      const { data: mentorData, error: mentorError } = await getMentorById(mentor.id);

      if (mentorError || !mentorData) {
        toast.error("Failed to load mentor information");
        return;
      }

      const { data: conversation, error: conversationError } = await getOrCreateConversation(
        user.id,
        mentor.id
      );

      if (conversationError || !conversation) {
        toast.error("Failed to start conversation with mentor");
        return;
      }

      toast.success(`Connected with ${mentor.name}. Redirecting to messages...`);
      navigate(`/messages?chat=${conversation.id}`);
    } catch (err) {
      toast.error("An unexpected error occurred while connecting to the mentor");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 md:p-8 shadow-md"
    >
      {/* Background Accent Gradient Overlay */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-gradient-to-tr from-accent/15 via-accent/5 to-transparent blur-3xl" />

      <div className="relative flex flex-col md:flex-row gap-6 md:gap-8 items-start justify-between">
        {/* Left Column: Avatar + Profile Summary */}
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          {/* Avatar with Status Dot */}
          <div className="relative group flex-shrink-0">
            <MentorAvatar
              name={mentor.name}
              src={mentor.profile_image}
              seed={mentor.id}
              className="h-28 w-28 md:h-32 md:w-32 rounded-2xl shadow-lg ring-4 ring-background/80 object-cover"
              fallbackClassName="rounded-2xl text-4xl"
            />
            {/* Status dot indicator */}
            <div className="absolute -bottom-1 -right-1 flex items-center gap-1.5 rounded-full border-2 border-background bg-card px-2 py-0.5 shadow-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </div>
          </div>

          {/* Details & Tagline */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                {mentor.name}
                <CheckCircle2 className="h-5 w-5 text-primary fill-primary/10 flex-shrink-0" title="Verified Mentor" />
              </h1>

              {mentor.is_alumni && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  Alumni {mentor.graduation_year ? `'${String(mentor.graduation_year).slice(-2)}` : ""}
                </Badge>
              )}
            </div>

            {/* Subtitle / Role & Dept */}
            <p className="text-sm md:text-base font-medium text-muted-foreground flex flex-wrap items-center gap-2">
              <span className="text-foreground/90 font-semibold">
                {mentor.job_title || `${mentor.department || "CSE"} Mentor`}
              </span>
              <span>•</span>
              <span>{formatDepartment(mentor.department)}</span>
              <span>•</span>
              <span className="text-primary font-medium">{mentor.university || "SRM AP"}</span>
            </p>

            {/* Headline / Value Statement Tagline */}
            {(mentor.tagline) && (
              <p className="text-base md:text-lg font-medium text-foreground/90 leading-snug pt-1 max-w-2xl italic">
                &ldquo;{mentor.tagline}&rdquo;
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons Column */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto flex-shrink-0 pt-2 md:pt-0">
          {isOwnProfile ? (
            <>
              <Button asChild variant="default" className="w-full gap-2 shadow-sm font-semibold">
                <Link to="/profile">
                  <Camera className="h-4 w-4" />
                  Edit Profile & Photo
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="outline" className="w-full gap-2">
                  <Link to="/admin">
                    <ShieldCheck className="h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={handleConnect}
                size="lg"
                className="w-full sm:w-auto gap-2 text-base font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isConnecting || !isMentorListed(mentor)}
              >
                {isConnecting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MessageCircle className="h-5 w-5 fill-primary-foreground/20" />
                )}
                {!isMentorListed(mentor)
                  ? "Not Accepting Requests"
                  : isConnecting
                  ? "Connecting..."
                  : "Connect with Mentor"}
              </Button>

              {canRate && !ratingLoading && (
                <Button variant="outline" size="lg" onClick={onShowRatingModal} className="w-full gap-2">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  Rate Mentor
                </Button>
              )}
            </>
          )}

          {mentor.linkedin_url && (
            <Button variant="ghost" size="sm" asChild className="w-full gap-2 text-muted-foreground hover:text-foreground">
              <a href={mentor.linkedin_url} target="_blank" rel="noopener noreferrer">
                <Linkedin className="h-4 w-4 text-sky-600" />
                LinkedIn Profile
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Trust Metrics Grid Bar */}
      <div className="mt-6 pt-6 border-t border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {/* Metric 1: Rating */}
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
            <Star className="h-5 w-5 fill-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground flex items-center gap-1">
              {mentor.rating > 0 ? mentor.rating.toFixed(1) : "New"}
              <span className="text-xs text-muted-foreground font-normal">
                ({mentor.review_count})
              </span>
            </div>
            <div className="text-xs text-muted-foreground">Rating Score</div>
          </div>
        </div>

        {/* Metric 2: Mentees */}
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 dark:bg-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">
              {mentor.availability_schedule.mentees_count}+
            </div>
            <div className="text-xs text-muted-foreground">Mentees Mentored</div>
          </div>
        </div>

        {/* Metric 3: Response Rate */}
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">
              {mentor.availability_schedule.response_rate}
            </div>
            <div className="text-xs text-muted-foreground">Response Rate</div>
          </div>
        </div>

        {/* Metric 4: Reply Time */}
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 p-3 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 dark:bg-purple-500/20">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground">
              {mentor.availability_schedule.response_time}
            </div>
            <div className="text-xs text-muted-foreground">Average Speed</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
