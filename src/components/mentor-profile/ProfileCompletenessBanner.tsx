import { useState } from "react";
import { Sparkles, FileText, GraduationCap, Drama, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { ProfileKickstartModal } from "@/components/profile/ProfileKickstartModal";
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
  const [kickstartOpen, setKickstartOpen] = useState(false);
  const [kickstartTab, setKickstartTab] = useState<"pdf" | "portal" | "clubs">("pdf");
  const [portalDialogOpen, setPortalDialogOpen] = useState(false);
  const { refreshProfile } = useAuth();

  // Compute unified profile completeness score (0 - 100)
  const checks = [
    { label: "Photo", done: Boolean(mentor.profile_image) },
    { label: "Tagline / Bio", done: Boolean(mentor.tagline || mentor.bio) },
    { label: "Skills (3+)", done: (mentor.skills?.length ?? 0) >= 3 },
    {
      label: "Outcomes / Topics",
      done: (mentor.outcomes?.length ?? 0) > 0 || (mentor.ask_me_anything?.length ?? 0) > 0,
    },
    { label: "Target Students", done: (mentor.ideal_mentees?.length ?? 0) > 0 },
    {
      label: "Coursework / LinkedIn",
      done: Boolean(
        (mentor.courses?.length ?? 0) > 0 ||
          mentor.linkedin_url ||
          (mentor.projects?.length ?? 0) > 0
      ),
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const percentage = Math.round((completedCount / checks.length) * 100);

  const openModalWithTab = (tab: "pdf" | "portal" | "clubs") => {
    if (tab === "portal") {
      setPortalDialogOpen(true);
    } else {
      setKickstartTab(tab);
      setKickstartOpen(true);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-indigo-500/5 to-purple-500/10 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-0.5 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Your Public Campus Profile
            </div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {percentage === 100
                ? "Your Profile is Complete & Live! 🎉"
                : `Profile Strength: ${percentage}% — Help peers & juniors find you`}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              {percentage === 100
                ? "Students can discover your skills, coursework, and club memberships in CampusMind search."
                : "Auto-fill your missing skills, coursework, and clubs in 10 seconds using your resume or student portal."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              asChild
              size="sm"
              className="gap-1.5 font-bold shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Link to="/profile/setup">
                <Sparkles className="h-4 w-4" />
                Launch Profile Studio
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openModalWithTab("portal")}
              className="gap-1.5 font-medium bg-background/80"
            >
              <GraduationCap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Link SRM Portal
            </Button>
          </div>
        </div>

        {/* Progress Bar & Badges */}
        <div className="mt-4 pt-3 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-3 w-full sm:max-w-xs">
            <Progress value={percentage} className="h-2 flex-1" />
            <span className="text-xs font-bold tabular-nums text-foreground">{percentage}%</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {checks.map((check, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                  check.done
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                {check.done ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : "○"}
                {check.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ProfileKickstartModal
        open={kickstartOpen}
        onOpenChange={setKickstartOpen}
        defaultTab={kickstartTab}
        onProfileUpdated={async () => {
          await refreshProfile();
          const { data } = await getMentorById(mentor.id);
          if (data) onMentorUpdated?.(data);
        }}
      />

      <ImportSrmPortalDialog
        open={portalDialogOpen}
        onOpenChange={setPortalDialogOpen}
        onSuccess={async () => {
          await refreshProfile();
          const { data } = await getMentorById(mentor.id);
          if (data) {
            onMentorUpdated?.(data);
          }
          toast.success("Courses linked to your public profile!");
        }}
      />
    </>
  );
}
