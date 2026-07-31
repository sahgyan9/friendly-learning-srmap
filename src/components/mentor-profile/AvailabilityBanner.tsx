import { useState } from "react";
import { CalendarClock, Loader2, Pause } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { setMentorAvailability } from "@/integrations/supabase/services/mentors";
import { Mentor } from "@/types/mentor";

interface AvailabilityBannerProps {
  mentor: Mentor;
  isOwnProfile: boolean;
  onResumed: (patch: Partial<Mentor>) => void;
}

/**
 * Shown above a paused mentor's profile.
 *
 * Two audiences, two messages. A visitor needs to know why the Connect button
 * is dead so they don't read it as the site being broken. The mentor themselves
 * needs to know this is their own setting and where to undo it — being quietly
 * absent from the directory with no visible cause is far worse for them than
 * for anyone else.
 */
const AvailabilityBanner = ({ mentor, isOwnProfile, onResumed }: AvailabilityBannerProps) => {
  const [resuming, setResuming] = useState(false);

  const backOn = mentor.available_from
    ? new Date(mentor.available_from).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
      })
    : null;

  const resume = async () => {
    setResuming(true);
    const { error } = await setMentorAvailability(true, null, null);
    setResuming(false);

    if (error) {
      toast.error(error.message || "Could not resume. Please try again.");
      return;
    }

    onResumed({ is_available: true, available_from: null, availability_note: null });
    toast.success("You're back in the directory");
  };

  const firstName = mentor.name?.split(" ")[0] || "This mentor";

  return (
    <div className="mb-6 rounded-xl border border-border bg-muted/40 p-5">
      <div className="flex items-start gap-3">
        <Pause className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />

        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">
            {isOwnProfile ? "Your profile is paused" : "Taking a break"}
          </h2>

          {mentor.availability_note && (
            <p className="mt-1 text-sm italic text-muted-foreground">
              “{mentor.availability_note}”
            </p>
          )}

          <p className="mt-1.5 text-sm text-muted-foreground">
            {isOwnProfile
              ? "You're hidden from the mentor directory. You're still a mentor and your existing conversations carry on as normal."
              : `${firstName} isn't accepting new connection requests right now.`}
          </p>

          {backOn ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5 flex-shrink-0" />
              Back on {backOn}.
            </p>
          ) : (
            isOwnProfile && (
              <p className="mt-1.5 text-sm text-muted-foreground">
                You'll stay hidden until you turn this back on.
              </p>
            )
          )}

          {isOwnProfile && (
            <Button size="sm" className="mt-3" onClick={resume} disabled={resuming}>
              {resuming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resume now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityBanner;
