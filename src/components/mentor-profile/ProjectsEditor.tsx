import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mentor } from "@/types/mentor";

type Project = NonNullable<Mentor["projects"]>[number];

interface ProjectsEditorProps {
  projects: Project[];
  onChange: (next: Project[]) => void;
}

export const MAX_PROJECTS = 6;

/**
 * List editor for a mentor's project entries, in the same "type and press add"
 * shape as SkillsEditor — just with three fields per entry instead of one.
 */
const ProjectsEditor = ({ projects, onChange }: ProjectsEditorProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");

  const add = () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) return;

    const trimmedLink = link.trim();
    // A link typed without a scheme (e.g. "github.com/x") would render as a
    // relative path on this site instead of leaving it — /github.com/x — so
    // it gets one by default rather than silently producing a dead link.
    const normalizedLink = trimmedLink
      ? /^https?:\/\//i.test(trimmedLink)
        ? trimmedLink
        : `https://${trimmedLink}`
      : undefined;

    onChange([
      ...projects,
      {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        description: trimmedDescription,
        link: normalizedLink,
      },
    ]);
    setTitle("");
    setDescription("");
    setLink("");
  };

  const remove = (id: string) => onChange(projects.filter((project) => project.id !== id));

  const atLimit = projects.length >= MAX_PROJECTS;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground">No projects yet — add one below.</p>
        )}
        {projects.map((project) => (
          <div
            key={project.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{project.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
              {project.link && (
                <p className="text-xs text-primary truncate">{project.link}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(project.id)}
              aria-label={`Remove ${project.title}`}
              className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          You've reached the {MAX_PROJECTS}-project limit — remove one to add another.
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Project title"
            className="h-9"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What does it do, and what did you build it with?"
            rows={2}
            className="resize-y text-sm"
          />
          <Input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="Link (optional) — GitHub, live demo, etc."
            className="h-9"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={add}
            disabled={!title.trim() || !description.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add project
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProjectsEditor;
