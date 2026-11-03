import { ExternalLink } from "lucide-react";
import { toast } from "sonner";

import EditableSection from "./EditableSection";
import ProjectsEditor from "./ProjectsEditor";
import { updateMentorFields } from "@/integrations/supabase/services/mentors";
import { EnhancedMentor } from "@/utils/mentor-enhancements";
import { Mentor } from "@/types/mentor";

type Project = NonNullable<Mentor["projects"]>[number];

interface MentorProjectsSectionProps {
  mentor: EnhancedMentor;
  isOwnProfile: boolean;
  onMentorUpdated: (mentor: Mentor) => void;
}

export default function MentorProjectsSection({
  mentor,
  isOwnProfile,
  onMentorUpdated,
}: MentorProjectsSectionProps) {
  const projects = mentor.projects || [];

  if (projects.length === 0 && !isOwnProfile) return null;

  const save = async (next: Project[]) => {
    const { data, error } = await updateMentorFields(mentor.id, { projects: next });

    if (error || !data) {
      toast.error("Could not save your projects. Try again.");
      return false;
    }

    onMentorUpdated({
      ...mentor,
      projects: next,
      ask_me_anything: Array.isArray(mentor.ask_me_anything)
        ? mentor.ask_me_anything.map((item) => (typeof item === "object" && item !== null ? (item as any).topic : item))
        : mentor.ask_me_anything,
    } as unknown as Mentor);
    toast.success("Projects saved.");
    return true;
  };

  return (
    <EditableSection<Project[]>
      editable={isOwnProfile}
      title="Projects"
      value={projects}
      onSave={save}
      renderEditor={(draft, setDraft) => <ProjectsEditor projects={draft} onChange={setDraft} />}
    >
      {projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No projects yet. Students look at projects first, so add one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {projects.map((proj) => (
            <article
              key={proj.id}
              className="flex min-w-0 flex-col gap-2 rounded-lg border border-border p-4"
            >
              <h3 className="truncate text-sm font-semibold text-foreground">{proj.title}</h3>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                {proj.description}
              </p>
              {proj.link && (
                <a
                  href={proj.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View project
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </EditableSection>
  );
}
