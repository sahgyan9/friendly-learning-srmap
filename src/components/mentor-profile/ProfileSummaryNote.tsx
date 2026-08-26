import { Info, PencilLine } from "lucide-react";
import { Link } from "react-router-dom";
import { EnhancedMentor } from "@/utils/mentor-enhancements";

interface ProfileSummaryNoteProps {
  mentor: EnhancedMentor;
  isOwnProfile: boolean;
}

/**
 * The one line that makes the summary sections honest.
 *
 * "What I can help you achieve", "Perfect if you are..." and "Ask me anything
 * about" are drafted by generate-mentor-summary from the mentor's own bio,
 * projects and coursework. They read as first-person statements, so a visitor
 * who is not told otherwise will reasonably assume the mentor typed them. They
 * did not, and saying so costs one line.
 *
 * Three states, in priority order:
 *   1. The mentor edited the summary -> the words are genuinely theirs, say
 *      nothing.
 *   2. A summary was generated -> disclose it.
 *   3. Nothing to show and it's their own profile -> tell them why the sections
 *      are missing and what fills them. Visitors see nothing; an empty profile
 *      should look sparse, not broken.
 */
export default function ProfileSummaryNote({ mentor, isOwnProfile }: ProfileSummaryNoteProps) {
  const hasSummary =
    mentor.outcomes.length > 0 ||
    mentor.ideal_mentees.length > 0 ||
    mentor.ask_me_anything.length > 0;

  const wasEdited = Boolean(mentor.profile_summary_edited_at);
  const wasGenerated = Boolean(mentor.profile_summary_generated_at);
  const firstName = mentor.name?.split(" ")[0] || "this mentor";

  if (hasSummary && wasGenerated && !wasEdited) {
    return (
      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Summarised from {firstName}&rsquo;s own profile, not written by them.
          {isOwnProfile &&
            " Use the pencil on any section above to rewrite it in your own words."}
        </span>
      </p>
    );
  }

  // Edited by the mentor: the words are theirs, so no disclosure is owed to a
  // visitor. The owner still needs to know the consequence of having edited,
  // because it is not reversible from the UI — we stopped regenerating this row
  // the moment they saved.
  if (hasSummary && wasEdited && isOwnProfile) {
    return (
      <p className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>
          You&rsquo;ve edited these sections, so they&rsquo;re yours now — we won&rsquo;t
          rewrite them when you update your bio.
        </span>
      </p>
    );
  }

  if (!hasSummary && isOwnProfile) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3.5 text-sm">
        <PencilLine className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            Your profile is missing the sections students skim first.
          </p>
          <p className="text-xs text-muted-foreground">
            &ldquo;What I can help you achieve&rdquo; and &ldquo;Perfect if you are&hellip;&rdquo;
            are built from your bio, projects and experience. Write a few specific lines about
            what you actually work on and they will fill in.{" "}
            <Link to="/profile/setup" className="font-semibold text-primary underline underline-offset-2">
              Open Profile Studio to customize them
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
