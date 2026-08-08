import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mentor } from "@/types/mentor";

type Experience = NonNullable<Mentor["experiences"]>[number];

interface ExperienceEditorProps {
  experiences: Experience[];
  onChange: (next: Experience[]) => void;
}

export const MAX_EXPERIENCES = 6;

/** List editor for a mentor's work/leadership experience, same shape as ProjectsEditor. */
const ExperienceEditor = ({ experiences, onChange }: ExperienceEditorProps) => {
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [period, setPeriod] = useState("");

  const add = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    onChange([
      ...experiences,
      {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        organization: organization.trim() || undefined,
        period: period.trim() || undefined,
      },
    ]);
    setTitle("");
    setOrganization("");
    setPeriod("");
  };

  const remove = (id: string) => onChange(experiences.filter((experience) => experience.id !== id));

  const atLimit = experiences.length >= MAX_EXPERIENCES;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {experiences.length === 0 && (
          <p className="text-sm text-muted-foreground">No experience added yet — add one below.</p>
        )}
        {experiences.map((experience) => (
          <div
            key={experience.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/60 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{experience.title}</p>
              {experience.organization && (
                <p className="text-xs text-muted-foreground">{experience.organization}</p>
              )}
              {experience.period && (
                <p className="text-xs text-muted-foreground/80">{experience.period}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => remove(experience.id)}
              aria-label={`Remove ${experience.title}`}
              className="flex-shrink-0 rounded-full p-1 text-muted-foreground hover:bg-background hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {atLimit ? (
        <p className="text-xs text-muted-foreground">
          You've reached the {MAX_EXPERIENCES}-entry limit — remove one to add another.
        </p>
      ) : (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Role or achievement, e.g. Teaching Assistant"
            className="h-9"
          />
          <Input
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
            placeholder="Organization (optional)"
            className="h-9"
          />
          <Input
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            placeholder="Period (optional), e.g. 2024 - Present"
            className="h-9"
          />
          <Button type="button" variant="outline" size="sm" onClick={add} disabled={!title.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Add experience
          </Button>
        </div>
      )}
    </div>
  );
};

export default ExperienceEditor;
