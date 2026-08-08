import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getFacultyInterestFacets } from "@/integrations/supabase/services/faculty";

const MAX_CHIPS = 10;
const MAX_CHIP_LENGTH = 40;
const SUGGESTION_COUNT = 8;

interface InterestsEditorProps {
  interests: string[];
  onInterestsChange: (next: string[]) => void;
  discoverable: boolean;
  onDiscoverableChange: (next: boolean) => void;
}

/** Lowercase-trim, drop anything empty or over the length cap. */
function normalise(raw: string): string | null {
  const value = raw.trim().toLowerCase().slice(0, MAX_CHIP_LENGTH);
  return value.length > 0 ? value : null;
}

/**
 * Free-text interest chips plus the discoverability switch.
 *
 * Deliberately no dropdown, no canonical list, no "did you mean" dedup UI —
 * interests are messy free text on purpose. The semantic search layer is what
 * collapses "ml" and "machine learning" into the same match, not a curated
 * taxonomy here. This component's only jobs are: cap the chip count so the row
 * doesn't overflow, and offer a handful of popular terms (sourced from the
 * faculty interest facets RPC, the only interest vocabulary that already
 * exists) as a shortcut, not a restriction.
 */
const InterestsEditor = ({
  interests,
  onInterestsChange,
  discoverable,
  onDiscoverableChange,
}: InterestsEditorProps) => {
  const [draft, setDraft] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    getFacultyInterestFacets(SUGGESTION_COUNT)
      .then(({ data, error }) => {
        if (cancelled || error) return;
        setSuggestions(data.map((row) => row.interest));
      })
      .catch(() => {
        // Hidden silently — the row just never appears.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addInterest = (raw: string) => {
    const value = normalise(raw);
    if (!value) return;
    if (interests.includes(value)) return;
    if (interests.length >= MAX_CHIPS) return;

    onInterestsChange([...interests, value]);
  };

  const removeInterest = (value: string) => {
    onInterestsChange(interests.filter((interest) => interest !== value));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addInterest(draft);
      setDraft("");
    }
  };

  const atCap = interests.length >= MAX_CHIPS;
  const visibleSuggestions = suggestions
    .filter((s) => !interests.includes(s))
    .slice(0, SUGGESTION_COUNT);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Heart className="h-4 w-4" />
          Interests
        </Label>

        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={atCap ? `Up to ${MAX_CHIPS} interests` : "Type an interest, press Enter"}
            disabled={atCap}
            maxLength={MAX_CHIP_LENGTH}
          />
        </div>

        {interests.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {interests.map((interest) => (
              <Badge key={interest} variant="secondary" className="cursor-pointer">
                {interest}
                <button
                  onClick={() => removeInterest(interest)}
                  className="ml-2 hover:text-destructive"
                  type="button"
                  aria-label={`Remove ${interest}`}
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {interests.length}/{MAX_CHIPS} — press Enter or comma to add
        </p>
      </div>

      {visibleSuggestions.length > 0 && !atCap && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Popular interests</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => addInterest(suggestion)}
                className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-1 text-xs transition-colors hover:border-primary/30 hover:bg-primary/5"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-3">
        <div className="space-y-1">
          <Label htmlFor="interests-discoverable" className="text-sm">
            Let other students find me by my interests
          </Label>
          <p className="text-xs text-muted-foreground">
            Interests make you appear when students search for what you're into; off means
            interests stay on your profile only.
          </p>
        </div>
        <Switch
          id="interests-discoverable"
          checked={discoverable}
          onCheckedChange={onDiscoverableChange}
        />
      </div>
    </div>
  );
};

export default InterestsEditor;
