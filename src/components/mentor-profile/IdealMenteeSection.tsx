import { motion } from "framer-motion";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";

import EditableSection from "./EditableSection";
import StringListEditor from "./StringListEditor";
import { updateMentorSummary } from "@/integrations/supabase/services/mentors";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { Mentor } from "@/types/mentor";

interface IdealMenteeSectionProps {
  mentor: EnhancedMentor;
  isOwnProfile: boolean;
  onMentorUpdated: (mentor: Mentor) => void;
}

/**
 * Hidden entirely when the mentor has no ideal-mentee list, and editable by the
 * mentor when they do.
 *
 * The four criteria here used to come from a template keyed off skills[0], so
 * every profile claimed to suit "a beginner looking to start with <skill>"
 * whether the mentor had ever said so or not. Now it is their list, and empty
 * means the section is absent rather than filled with a plausible guess.
 */
export default function IdealMenteeSection({
  mentor,
  isOwnProfile,
  onMentorUpdated,
}: IdealMenteeSectionProps) {
  const criteria = mentor.ideal_mentees;

  if (criteria.length === 0 && !isOwnProfile) return null;

  const save = async (next: string[]) => {
    const cleaned = next.map((s) => s.trim()).filter(Boolean);
    const { data, error } = await updateMentorSummary(mentor.id, { ideal_mentees: cleaned });
    if (error || !data) {
      toast.error("Could not save. Please try again.");
      return false;
    }
    onMentorUpdated(data as unknown as Mentor);
    toast.success("Saved — this section is yours now and won't be regenerated.");
    return true;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <EditableSection<string[]>
        editable={isOwnProfile}
        title="Perfect if you are..."
        icon={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserCheck className="h-4 w-4" />
          </div>
        }
        value={criteria}
        onSave={save}
        className="border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card"
        renderEditor={(draft, setDraft) => (
          <StringListEditor
            items={draft}
            onChange={setDraft}
            maxItems={6}
            maxLength={120}
            placeholder="First-year who has never used Git"
            addLabel="Add a description"
            hint="Describe the student, not yourself — this is what a reader checks themselves against."
          />
        )}
      >
        {criteria.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            Describe who you are the right person to help, so students can self-select.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-muted-foreground">
              Self-select if this mentor&rsquo;s guidance aligns with your goals
            </p>
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              {criteria.map((criterion, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 rounded-xl border border-primary/15 bg-background/80 p-3.5 shadow-2xs transition-colors hover:border-primary/40"
                >
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    ✓
                  </div>
                  <span className="text-sm font-medium text-foreground">{criterion}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </EditableSection>
    </motion.div>
  );
}
