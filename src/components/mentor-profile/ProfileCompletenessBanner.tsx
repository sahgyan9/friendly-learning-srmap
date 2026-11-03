import { useState } from "react";
import { Check, Circle, GraduationCap, Pencil, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { ImportSrmPortalDialog } from "@/components/profile/ImportSrmPortal";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";

import { getMentorById } from "@/integrations/supabase/services/mentors";

interface ProfileCompletenessBannerProps {
  mentor: EnhancedMentor;
  onMentorUpdated?: (mentor: any) => void;
}

export default function ProfileCompletenessBanner({
  mentor,
  onMentorUpdated,
}: ProfileCompletenessBannerProps) {
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const { refreshProfile } = useAuth();

  // Compute unified profile completeness score (0 - 100)
  const checks = [
    { label: "Photo", done: Boolean(mentor.profile_image) },
    { label: "Tagline or bio", done: Boolean(mentor.tagline || mentor.bio) },
    { label: "3+ skills", done: (mentor.skills?.length ?? 0) >= 3 },
    {
      label: "Outcomes or topics",
      done: (mentor.outcomes?.length ?? 0) > 0 || (mentor.ask_me_anything?.length ?? 0) > 0,
    },
    { label: "Who you help", done: (mentor.ideal_mentees?.length ?? 0) > 0 },
    {
      label: "Courses, projects or LinkedIn",
      done: Boolean(
        (mentor.courses?.length ?? 0) > 0 ||
          mentor.linkedin_url ||
          (mentor.projects?.length ?? 0) > 0
      ),
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const percentage = Math.round((completedCount / checks.length) * 100);
  const isComplete = percentage === 100;

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      toast.success("Profile link copied.");
    } else {
      toast.info(`Profile URL: ${url}`);
    }
  };

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5 shadow-card md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {isComplete ? "Your profile is complete" : "Finish your profile"}
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              {isComplete
                ? "Classmates and juniors can find you by skill, coursework and club, and message you directly."
                : "Fill in the missing parts from your resume or the student portal so students searching for your skills can find you."}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link to="/profile/setup">
                <Pencil />
                {isComplete ? "Edit profile" : "Complete profile"}
              </Link>
            </Button>
            {isComplete && (
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 />
                Copy link
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setPortalDialogOpen(true)}>
              <GraduationCap />
              {(mentor.courses?.length ?? 0) > 0 ? "Re-import courses" : "Import courses"}
            </Button>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center gap-3 sm:max-w-xs">
            <Progress value={percentage} className="h-1.5 flex-1" aria-label="Profile completeness" />
            <span className="text-sm font-medium text-foreground tabular">
              {completedCount} of {checks.length}
            </span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {checks.map((check, idx) => (
              <li
                key={idx}
                className={`inline-flex items-center gap-1.5 ${check.done ? "text-foreground" : "text-muted-foreground"}`}
              >
                {check.done ? (
                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-label="Done" />
                ) : (
                  <Circle className="h-4 w-4" aria-label="Missing" />
                )}
                {check.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ImportSrmPortalDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        onSuccess={async () => {
          await refreshProfile();
          const { data } = await getMentorById(mentor.id);
          if (data) {
            onMentorUpdated?.(data);
          }
          toast.success("Courses added to your public profile.");
        }}
      />
    </>
  );
}
