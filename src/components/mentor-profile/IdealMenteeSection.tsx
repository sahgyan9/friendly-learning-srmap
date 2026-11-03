import { Check } from "lucide-react";
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
      toast.error("Could not save. Try again.");
      return false;
    }
    onMentorUpdated(data as unknown as Mentor);
    toast.success("Saved. This section will not be regenerated.");
    return true;
  };

  return (
    <EditableSection<string[]>
        editable={isOwnProfile}
        title="A good fit if you are"
        value={criteria}
        onSave={save}
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
          <p className="text-sm text-muted-foreground">
            Describe who you are the right person to help, so students can self-select.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            {criteria.map((criterion, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm leading-snug text-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                {criterion}
              </li>
            ))}
          </ul>
        )}
      </EditableSection>
  );
}
