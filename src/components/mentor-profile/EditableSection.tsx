import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditableSectionProps<T> {
  /** Only the profile's owner gets the pencil; everyone else sees plain content. */
  editable: boolean;
  /** Current value, re-read whenever editing starts so a cancel truly discards. */
  value: T;
  onSave: (next: T) => Promise<boolean>;
  /** Rendered when not editing. */
  children: ReactNode;
  /** Rendered when editing, with a draft the caller mutates. */
  renderEditor: (draft: T, setDraft: (next: T) => void) => ReactNode;
  title: string;
  icon?: ReactNode;
  /** Optional right-hand content for the header, hidden while editing. */
  action?: ReactNode;
  className?: string;
}

/**
 * A profile section that its owner can edit without leaving the page.
 *
 * The alternative was to keep sending people to /profile, which meant losing
 * your scroll position and the context of what you were looking at in order to
 * change one line of a bio. Each section owns its own draft and its own save,
 * so a failed write to one leaves the others untouched.
 */
function EditableSection<T>({
  editable,
  value,
  onSave,
  children,
  renderEditor,
  title,
  icon,
  action,
  className,
}: EditableSectionProps<T>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<T>(value);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Focus the first field on open. Without this the pencil keeps keyboard focus
  // and the caret never reaches the textarea that just appeared.
  useEffect(() => {
    if (!editing) return;
    const field = editorRef.current?.querySelector<HTMLElement>("input, textarea");
    field?.focus();
  }, [editing]);

  const start = () => {
    // Seed from the live value rather than trusting whatever the last cancelled
    // edit left in state.
    setDraft(value);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const save = async () => {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    // A failed save keeps the editor open with the user's text still in it.
    if (ok) setEditing(false);
  };

  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-sm transition-colors",
        editing && "border-primary/40 ring-1 ring-primary/20",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          {icon}
          {title}
        </h2>

        {editing ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1 h-4 w-4" />
              )}
              Save
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {action}
            {editable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={start}
                aria-label={`Edit ${title.toLowerCase()}`}
                className="text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {editing ? <div ref={editorRef}>{renderEditor(draft, setDraft)}</div> : children}
    </section>
  );
}

export default EditableSection;
