import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Star,
  MessageCircle,
  Linkedin,
  GraduationCap,
  Camera,
  ShieldCheck,
  Pencil,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MentorAvatar from "@/components/mentors/MentorAvatar";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { Mentor } from "@/types/mentor";
import { useAuth } from "@/context/AuthContext";
import {
  isMentorListed,
  getMentorById,
  updateMentorSummary,
} from "@/integrations/supabase/services/mentors";
import { getOrCreateConversation } from "@/integrations/supabase/services/chat";
import { toast } from "sonner";
import { formatDepartment } from "@/utils/user-utils";
import { useMentorActivity } from "@/hooks/useMentorActivity";
import {
  activityRecency,
  isNewMentor,
  recencyLabel,
  replyRate,
  replySpeed,
} from "@/lib/mentor-activity";

interface MentorHeroHeaderProps {
  mentor: EnhancedMentor;
  canRate: boolean;
  hasRated?: boolean;
  ratingLoading: boolean;
  onShowRatingModal: () => void;
  onMentorUpdated?: (mentor: Mentor) => void;
}

export default function MentorHeroHeader({
  mentor,
  canRate,
  hasRated = false,
  ratingLoading,
  onShowRatingModal,
  onMentorUpdated,
}: MentorHeroHeaderProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  // The tagline is the most prominent line drafted for a mentor, so it is the
  // one they are most likely to want to correct. Edited here rather than behind
  // a pencil in some settings page, for the same reason the other sections are.
  const [editingTagline, setEditingTagline] = useState(false);
  const [taglineDraft, setTaglineDraft] = useState("");
  const [savingTagline, setSavingTagline] = useState(false);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { activity, loading: activityLoading } = useMentorActivity(mentor.id);

  const isOwnProfile = Boolean(user && mentor && user.id === mentor.id);
  const canEditTagline = isOwnProfile && Boolean(onMentorUpdated);

  const startEditingTagline = () => {
    setTaglineDraft(mentor.tagline ?? "");
    setEditingTagline(true);
  };

  const saveTagline = async () => {
    setSavingTagline(true);
    // An empty tagline is a valid choice, not a failed edit — it removes the
    // line rather than leaving the drafted one in place.
    const next = taglineDraft.trim();
    const { data, error } = await updateMentorSummary(mentor.id, { tagline: next || null });
    setSavingTagline(false);

    if (error || !data) {
      toast.error("Could not save your tagline. Try again.");
      return;
    }
    onMentorUpdated?.(data as unknown as Mentor);
    setEditingTagline(false);
    toast.success("Tagline saved. It will not be regenerated.");
  };

  const recency = activityRecency(activity?.last_message_at ?? null);
  const recencyText = activityLoading ? null : recencyLabel(recency);

  const rate = activity ? replyRate(activity) : null;
  const speed = activity ? replySpeed(activity) : null;
  const helped = activity?.students_helped ?? 0;

  const handleConnect = async () => {
    if (!user) {
      toast.error("Sign in to message mentors.");
      return;
    }

    if (mentor.id === user.id) {
      toast.error("You cannot message yourself.");
      return;
    }

    setIsConnecting(true);

    try {
      const { data: mentorData, error: mentorError } = await getMentorById(mentor.id);

      if (mentorError || !mentorData) {
        toast.error("Could not load this mentor. Try again.");
        return;
      }

      const { data: conversation, error: conversationError } = await getOrCreateConversation(
        user.id,
        mentor.id
      );

      if (conversationError || !conversation) {
        toast.error("Could not start the conversation. Try again.");
        return;
      }

      toast.success(`Conversation with ${mentor.name} opened.`);
      navigate(`/messages/${conversation.id}`);
    } catch (err) {
      toast.error("Could not start the conversation. Try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  const listed = isMentorListed(mentor);
  const metaParts = [
    mentor.job_title || formatDepartment(mentor.department),
    mentor.job_title && mentor.department ? formatDepartment(mentor.department) : null,
    mentor.year_of_studies || null,
    mentor.university || "SRM AP",
  ].filter(Boolean);

  const metrics: { label: string; value: string }[] = [
    {
      label: mentor.review_count === 1 ? "1 review" : `${mentor.review_count} reviews`,
      value: mentor.rating > 0 ? mentor.rating.toFixed(1) : "New",
    },
    {
      // The certificate's definition: both sides spoke.
      label: helped === 1 ? "Student helped" : "Students helped",
      value: activityLoading ? "\u2014" : helped === 0 ? "None yet" : String(helped),
    },
  ];
  // Reply rate and speed are omitted below their confidence floor (see
  // @/lib/mentor-activity) rather than shown from one or two data points.
  if (rate !== null) metrics.push({ label: "Replies to messages", value: `${rate}%` });
  // Median, so one late reply cannot define it.
  if (speed !== null) metrics.push({ label: "Typical reply time", value: speed });

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6 animate-fade-up">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <MentorAvatar
            name={mentor.name}
            src={mentor.profile_image}
            seed={mentor.id}
            className="h-24 w-24 shrink-0 md:h-28 md:w-28"
            fallbackClassName="text-3xl"
          />

          <div className="min-w-0 space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
              {mentor.name}
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">{metaParts.join(" · ")}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              {mentor.is_alumni && (
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Alumni{mentor.graduation_year ? ` '${String(mentor.graduation_year).slice(-2)}` : ""}
                </span>
              )}
              {/* When the mentor was last active across the platform. Nothing
                  at all after a month: the absence is the honest signal. */}
              {recencyText && (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className={`h-2 w-2 rounded-full ${recency === "week" ? "bg-emerald-500" : "bg-amber-500"}`}
                    aria-hidden
                  />
                  {recencyText}
                </span>
              )}
              {mentor.linkedin_url && (
                <a
                  href={mentor.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </a>
              )}
            </div>

            {editingTagline ? (
              <div className="max-w-2xl space-y-2 pt-1">
                <Textarea
                  value={taglineDraft}
                  maxLength={200}
                  rows={2}
                  autoFocus
                  placeholder="One line on what you actually help with."
                  onChange={(e) => setTaglineDraft(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveTagline} isLoading={savingTagline}>
                    {!savingTagline && <Check />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingTagline(false)}
                    disabled={savingTagline}
                  >
                    Cancel
                  </Button>
                  <span className="ml-auto text-xs text-muted-foreground tabular">
                    {taglineDraft.length}/200
                  </span>
                </div>
              </div>
            ) : mentor.tagline ? (
              <p className="flex max-w-2xl items-start gap-2 pt-1 text-base leading-snug text-foreground md:text-lg">
                <span>{mentor.tagline}</span>
                {canEditTagline && (
                  <button
                    type="button"
                    onClick={startEditingTagline}
                    aria-label="Edit tagline"
                    className="-m-1 mt-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </p>
            ) : canEditTagline ? (
              <button
                type="button"
                onClick={startEditingTagline}
                className="flex items-center gap-1.5 pt-1 text-sm text-primary underline-offset-4 hover:underline"
              >
                <Pencil className="h-4 w-4" />
                Add a one-line tagline
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto md:flex-col">
          {isOwnProfile ? (
            <>
              <Button asChild>
                <Link to="/profile">
                  <Camera />
                  Edit profile and photo
                </Link>
              </Button>
              {isAdmin && (
                <Button asChild variant="outline">
                  <Link to="/admin">
                    <ShieldCheck />
                    Admin dashboard
                  </Link>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                onClick={handleConnect}
                isLoading={isConnecting}
                disabled={isConnecting || !listed}
              >
                {!isConnecting && <MessageCircle />}
                {listed ? "Message" : "Not accepting messages"}
              </Button>

              {!ratingLoading && (
                <Button variant="outline" onClick={onShowRatingModal}>
                  <Star />
                  {hasRated ? "Edit your rating" : "Rate"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Every figure below is measured: rating and review count from
          mentor_reviews, the rest from public.mentor_activity() over real
          conversations. The grid sizes itself to however many earned a place. */}
      <dl
        className={`mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 ${
          metrics.length >= 4 ? "sm:grid-cols-4" : metrics.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        {metrics.map((metric, index) => (
          <div key={metric.label} className="min-w-0">
            <dd className="flex items-center gap-1.5 text-xl font-semibold tracking-tight text-foreground tabular">
              {index === 0 && mentor.rating > 0 && (
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              )}
              {metric.value}
            </dd>
            <dt className="mt-0.5 text-xs text-muted-foreground">{metric.label}</dt>
          </div>
        ))}
      </dl>

      {/* Said plainly rather than papered over with a flattering default. A
          student deciding who to message is better served by "no track record
          yet" than by a 91% that was never earned. */}
      {!activityLoading && isNewMentor(activity) && (
        <p className="mt-4 text-sm text-muted-foreground">
          {isOwnProfile
            ? "Your reply rate and typical response time will appear here once students start messaging you."
            : `${mentor.name?.split(" ")[0] || "This mentor"} has not been messaged on the platform yet.`}
        </p>
      )}
    </section>
  );
}
