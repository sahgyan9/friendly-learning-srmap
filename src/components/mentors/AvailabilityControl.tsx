import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setMentorAvailability } from "@/integrations/supabase/services/mentors";
import { cn } from "@/lib/utils";

const NOTE_MAX = 120;

/** null means "until I turn it back on" — the RPC reads a null deadline that way. */
const DURATIONS: { label: string; days: number | null }[] = [
  { label: "1 day", days: 1 },
  { label: "7 days", days: 7 },
  { label: "Until I turn it back on", days: null },
];

interface AvailabilityControlProps {
  isAvailable: boolean;
  availableFrom: string | null;
  note: string | null;
  onChange: (next: {
    is_available: boolean;
    available_from: string | null;
    availability_note: string | null;
  }) => void;
}

/**
 * Lets a mentor take themselves out of the directory for a while.
 *
 * This replaces an "Available for Connections" dropdown that wrote
 * `users.is_available` — a column nothing has ever read. The directory reads
 * `public.mentors`, so the old control was decorative: a mentor who set "No"
 * stayed listed and kept receiving requests.
 *
 * It saves immediately through the RPC rather than joining the surrounding
 * profile form. Availability is the one setting people change *because*
 * something is happening right now, and making them find Save at the bottom of
 * a long form to escape their notifications is the wrong moment to be strict
 * about form conventions.
 */
const AvailabilityControl = ({
  isAvailable,
  availableFrom,
  note,
  onChange,
}: AvailabilityControlProps) => {
  const [saving, setSaving] = useState<"resume" | "pause" | null>(null);
  const [draftNote, setDraftNote] = useState(note ?? "");
  const [showOptions, setShowOptions] = useState(false);

  const backOn = availableFrom
    ? new Date(availableFrom).toLocaleDateString(undefined, { day: "numeric", month: "long" })
    : null;

  const apply = async (available: boolean, days: number | null) => {
    setSaving(available ? "resume" : "pause");
    const trimmed = draftNote.trim();
    const { data, error } = await setMentorAvailability(
      available,
      days,
      trimmed ? trimmed : null,
    );
    setSaving(null);

    if (error) {
      toast.error(error.message || "Could not save that. Please try again.");
      return;
    }

    const row = data as {
      is_available: boolean;
      available_from: string | null;
      availability_note: string | null;
    } | null;

    onChange({
      is_available: row?.is_available ?? available,
      available_from: row?.available_from ?? null,
      availability_note: row?.availability_note ?? null,
    });

    if (available) {
      setDraftNote("");
      setShowOptions(false);
      toast.success("You're back in the directory");
    } else {
      setShowOptions(false);
      toast.success("You're hidden from the directory");
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <Label className="text-base">Availability</Label>
        {/* Without this, people read "take a break" as "delete my profile" and
            never touch it — they just stop replying instead, which is worse for
            the student waiting on them. */}
        <p className="mt-1 text-xs text-muted-foreground">
          You stay a mentor and your existing conversations carry on — you just stop appearing in
          the directory.
        </p>
      </div>

      {isAvailable ? (
        <>
          <p className="text-sm text-foreground">
            You're listed. Students can find and message you.
          </p>

          {showOptions ? (
            <div className="space-y-3 rounded-md bg-muted/50 p-3">
              <p className="text-sm font-medium text-foreground">When should you come back?</p>

              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((option) => (
                  <Button
                    key={option.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving !== null}
                    onClick={() => apply(false, option.days)}
                  >
                    {saving === "pause" && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="availability-note" className="text-xs">
                  Note (optional)
                </Label>
                <Input
                  id="availability-note"
                  value={draftNote}
                  maxLength={NOTE_MAX}
                  onChange={(event) => setDraftNote(event.target.value)}
                  placeholder="Back after end-sems"
                  className="h-9"
                />
                <p
                  className={cn(
                    "text-right text-2xs",
                    draftNote.length >= NOTE_MAX ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {draftNote.length}/{NOTE_MAX}
                </p>
              </div>

              <Button type="button" variant="ghost" size="sm" onClick={() => setShowOptions(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setShowOptions(true)}>
              Take a break
            </Button>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-foreground">
            Hidden from the directory{backOn ? `. Back on ${backOn}.` : " until you turn this back on."}
          </p>

          {note && <p className="text-sm italic text-muted-foreground">“{note}”</p>}

          <Button
            type="button"
            size="sm"
            disabled={saving !== null}
            onClick={() => apply(true, null)}
          >
            {saving === "resume" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            I'm available again
          </Button>
        </>
      )}
    </div>
  );
};

export default AvailabilityControl;
