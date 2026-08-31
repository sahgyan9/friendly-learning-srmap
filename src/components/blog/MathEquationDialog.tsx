import { useEffect, useState } from "react";
import katex from "katex";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface MathEquationDialogProps {
  open: boolean;
  mode: "insert" | "edit";
  initialLatex: string;
  initialDisplayMode: boolean;
  onCancel: () => void;
  onConfirm: (latex: string, displayMode: boolean) => void;
}

/** Editing an existing node can't change inline <-> block (that's a different
 * node type, and setNodeMarkup only updates attrs on the same one) — the
 * toggle only makes sense for a fresh insert. */

/**
 * One dialog shared by both the toolbar's Σ button (fresh insert) and a
 * double-click on an existing equation (edit) — BlogPostEditor decides what
 * onConfirm does with the result, this component only owns the LaTeX
 * textarea and its live preview.
 */
export function MathEquationDialog({
  open,
  mode,
  initialLatex,
  initialDisplayMode,
  onCancel,
  onConfirm,
}: MathEquationDialogProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [displayMode, setDisplayMode] = useState(initialDisplayMode);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLatex(initialLatex);
    setDisplayMode(initialDisplayMode);
  }, [open, initialLatex, initialDisplayMode]);

  useEffect(() => {
    if (!latex.trim()) {
      setPreview("");
      setError(null);
      return;
    }
    const timer = setTimeout(() => {
      try {
        setPreview(katex.renderToString(latex, { throwOnError: true, displayMode, output: "html" }));
        setError(null);
      } catch (e) {
        setPreview(katex.renderToString(latex, { throwOnError: false, displayMode, output: "html" }));
        setError(e instanceof Error ? e.message : "That doesn't parse as LaTeX");
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [latex, displayMode]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit equation" : "Insert equation"}</DialogTitle>
          <DialogDescription>Write LaTeX — the preview below updates as you type.</DialogDescription>
        </DialogHeader>

        <Textarea
          value={latex}
          onChange={(e) => setLatex(e.target.value)}
          placeholder="e.g. E = mc^2"
          className="min-h-[90px] font-mono text-sm"
          autoFocus
        />

        {mode === "insert" && (
          <div className="flex items-center gap-2">
            <Switch id="math-display-mode" checked={displayMode} onCheckedChange={setDisplayMode} />
            <Label htmlFor="math-display-mode">Display as its own centered block, not inline with text</Label>
          </div>
        )}

        <div className="min-h-[64px] overflow-x-auto rounded-md border border-input bg-muted/30 px-3 py-2">
          {latex.trim() ? (
            <span dangerouslySetInnerHTML={{ __html: preview }} />
          ) : (
            <span className="text-sm text-muted-foreground">Preview appears here</span>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(latex.trim(), displayMode)} disabled={!latex.trim()}>
            {mode === "edit" ? "Save Equation" : "Insert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
