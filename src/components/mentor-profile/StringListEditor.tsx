import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StringListEditorProps {
  items: string[];
  onChange: (next: string[]) => void;
  /** Matches the CHECK constraint on the column so a save cannot be rejected. */
  maxItems: number;
  maxLength: number;
  placeholder: string;
  addLabel: string;
  /** One line of guidance. Worth being specific — vague lines are why the
   *  generated ones read better than hand-written ones. */
  hint?: string;
}

/**
 * Add/edit/remove a short list of one-line strings.
 *
 * Used for the three summary lists (outcomes, ideal mentees, ask-me-anything
 * topics). The item and length caps mirror the database CHECK constraints from
 * 20260823190000_mentor_profile_summary.sql rather than being invented here, so
 * the editor cannot compose a value the column will reject — an over-long entry
 * is stopped at the keystroke instead of at save, where the error would be an
 * opaque constraint violation.
 */
export default function StringListEditor({
  items,
  onChange,
  maxItems,
  maxLength,
  placeholder,
  addLabel,
  hint,
}: StringListEditorProps) {
  const setAt = (index: number, value: string) => {
    const next = [...items];
    next[index] = value.slice(0, maxLength);
    onChange(next);
  };

  const removeAt = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="space-y-3">
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              maxLength={maxLength}
              placeholder={placeholder}
              onChange={(e) => setAt(index, e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove item ${index + 1}`}
              onClick={() => removeAt(index)}
              className="flex-shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {items.length < maxItems ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="mr-1 h-4 w-4" />
          {addLabel}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          That&rsquo;s the maximum of {maxItems}. Remove one to add another.
        </p>
      )}

      {items.length === 0 && (
        <p className="text-xs italic text-muted-foreground">
          Saving with none removes this section from your profile.
        </p>
      )}
    </div>
  );
}
