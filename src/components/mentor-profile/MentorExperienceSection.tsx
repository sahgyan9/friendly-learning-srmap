import { Briefcase } from "lucide-react";
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
      toast.error("Could not save your experience. Please try again.");
      return false;
    }

    // EnhancedMentor's ask_me_anything is a display-only reshape of Mentor's — a
    // pre-existing mismatch between the two types unrelated to this save.
    onMentorUpdated({ ...mentor, experiences: next } as unknown as Mentor);
    toast.success("Experience updated");
    return true;
  };

  return (
    <EditableSection<Experience[]>
      editable={isOwnProfile}
      title="Experience & Achievements"
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
          <Briefcase className="h-4 w-4" />
        </div>
      }
      value={experiences}
      onSave={save}
      renderEditor={(draft, setDraft) => <ExperienceEditor experiences={draft} onChange={setDraft} />}
    >
      {experiences.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          Add a role, leadership position, or achievement worth highlighting.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="flex items-start gap-3.5 rounded-xl border border-border/60 bg-background/50 p-4 hover:border-amber-500/30 transition-all"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
                <Briefcase className="h-4 w-4" />
              </div>

              <div className="space-y-0.5 min-w-0">
                <h3 className="text-sm font-bold text-foreground truncate">{exp.title}</h3>
                {exp.organization && (
                  <p className="text-xs font-medium text-muted-foreground">{exp.organization}</p>
                )}
                {exp.period && (
                  <p className="text-2xs text-muted-foreground/80">{exp.period}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </EditableSection>
  );
}
