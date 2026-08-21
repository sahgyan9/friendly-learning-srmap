import { FolderGit2, ExternalLink } from "lucide-react";
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
      toast.error("Could not save your projects. Please try again.");
      return false;
    }

    onMentorUpdated({
      ...mentor,
      projects: next,
      ask_me_anything: Array.isArray(mentor.ask_me_anything)
        ? mentor.ask_me_anything.map((item) => (typeof item === "object" && item !== null ? (item as any).topic : item))
        : mentor.ask_me_anything,
    } as unknown as Mentor);
    toast.success("Projects updated");
    return true;
  };

  return (
    <EditableSection<Project[]>
      editable={isOwnProfile}
      title="Featured Projects"
      icon={
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
          <FolderGit2 className="h-4 w-4" />
        </div>
      }
      value={projects}
      onSave={save}
      renderEditor={(draft, setDraft) => <ProjectsEditor projects={draft} onChange={setDraft} />}
    >
      {projects.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">
          Add your first project — it's the first thing students look at.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="flex flex-col justify-between rounded-xl border border-border/60 bg-background/60 p-4 hover:border-blue-500/40 hover:shadow-md transition-all group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                    {proj.title}
                  </h3>
                  {proj.link && (
                    <a
                      href={proj.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {proj.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </EditableSection>
  );
}
