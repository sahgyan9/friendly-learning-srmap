import { useState } from "react";
import { Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SkillsEditorProps {
  skills: string[];
  onChange: (next: string[]) => void;
}

/**
 * Chip editor for a mentor's skill list.
 *
 * Enter adds, because typing a dozen skills and reaching for the mouse between
 * each one is the sort of thing that makes people give up after four.
 */
const SkillsEditor = ({ skills, onChange }: SkillsEditorProps) => {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    // Case-insensitive, so "Python" and "python" cannot both end up on a card
    // that only has room to show three of them.
    if (skills.some((skill) => skill.toLowerCase() === value.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...skills, value]);
    setDraft("");
  };

  const remove = (skill: string) => onChange(skills.filter((entry) => entry !== skill));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {skills.length === 0 && (
          <p className="text-sm text-muted-foreground">No skills yet — add a few below.</p>
        )}
        {skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="gap-1 pr-1 text-sm">
            {skill}
            <button
              type="button"
              onClick={() => remove(skill)}
              aria-label={`Remove ${skill}`}
              className="rounded-full p-0.5 hover:bg-background/60"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            // The section sits inside no form today, but preventing default
            // keeps Enter from submitting one if it ever does.
            event.preventDefault();
            add();
          }}
          placeholder="Add a skill and press Enter"
          className="h-9"
        />
        <Button type="button" variant="outline" size="sm" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">Add skill</span>
        </Button>
      </div>
    </div>
  );
};

export default SkillsEditor;
