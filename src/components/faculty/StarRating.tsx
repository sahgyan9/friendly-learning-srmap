import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-8 w-8",
} as const;

interface StarRatingProps {
  value: number;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * Read-only star display. Renders half-stars by clipping a filled layer over an
 * outline layer, so 4.3 looks like 4.3 rather than rounding to 4.
 */
export function StarRating({ value, size = "md", className }: StarRatingProps) {
  const clamped = Math.min(5, Math.max(0, value));

  return (
    <span
      className={cn("relative inline-flex", className)}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5`}
    >
      <span className="flex gap-0.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <Star key={index} className={cn(SIZES[size], "text-muted-foreground/35")} />
        ))}
      </span>

      <span
        className="pointer-events-none absolute inset-0 flex gap-0.5 overflow-hidden"
        style={{ width: `${(clamped / 5) * 100}%` }}
        aria-hidden
      >
        {[0, 1, 2, 3, 4].map((index) => (
          <Star key={index} className={cn(SIZES[size], "shrink-0 fill-amber-400 text-amber-400")} />
        ))}
      </span>
    </span>
  );
}

interface StarInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  hint?: string;
  disabled?: boolean;
}

/** Interactive row used inside the rating modal. Keyboard accessible. */
export function StarInput({ value, onChange, label, hint, disabled }: StarInputProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          {value > 0 ? `${value}/5` : "—"}
        </span>
      </div>

      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            disabled={disabled}
            onClick={() => onChange(star)}
            className={cn(
              "rounded p-1 transition-transform hover:scale-110",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <Star
              className={cn(
                "h-7 w-7 transition-colors",
                star <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
