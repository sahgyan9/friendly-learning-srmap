import { toast } from "sonner";

import EditableSection from "./EditableSection";
import ExperienceEditor from "./ExperienceEditor";
import { updateMentorFields } from "@/integrations/supabase/services/mentors";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { Mentor } from "@/types/mentor";

type Experience = NonNullable<Mentor["experiences"]>[number];

interface MentorExperienceSectionProps {
  mentor: EnhancedMentor;
  isOwnProfile: boolean;
  onMentorUpdated: (mentor: Mentor) => void;
}

export default function MentorExperienceSection({
  mentor,
  isOwnProfile,
  onMentorUpdated,
}: MentorExperienceSectionProps) {
  const experiences = mentor.experiences || [];

  if (experiences.length === 0 && !isOwnProfile) return null;

  const save = async (next: Experience[]) => {
    const { data, error } = await updateMentorFields(mentor.id, { experiences: next });

    if (error || !data) {
      toast.error("Could not save your experience. Try again.");
      return false;
    }

    onMentorUpdated({
      ...mentor,
      experiences: next,
      ask_me_anything: Array.isArray(mentor.ask_me_anything)
        ? mentor.ask_me_anything.map((item) => (typeof item === "object" && item !== null ? (item as any).topic : item))
        : mentor.ask_me_anything,
    } as unknown as Mentor);
    toast.success("Experience saved.");
    return true;
  };

  return (
    <EditableSection<Experience[]>
      editable={isOwnProfile}
      title="Experience"
      value={experiences}
      onSave={save}
      renderEditor={(draft, setDraft) => <ExperienceEditor experiences={draft} onChange={setDraft} />}
    >
      {experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add a role, leadership position, or achievement worth highlighting.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {experiences.map((exp) => (
            <li key={exp.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-foreground">{exp.title}</h3>
                {exp.organization && (
                  <p className="text-sm text-muted-foreground">{exp.organization}</p>
                )}
              </div>
              {exp.period && (
                <p className="shrink-0 text-xs text-muted-foreground tabular">{exp.period}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </EditableSection>
  );
}
