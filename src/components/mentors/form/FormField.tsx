import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  /** Must match the control's `id` so the label and message wire up to it. */
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  /** Guidance shown while the field is valid; replaced by the error when not. */
  hint?: React.ReactNode;
  /** Rendered at the right of the label row — used for the bio counter. */
  adornment?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * One field, one place that decides how "required" and "invalid" look.
 *
 * The controls previously each spelled out their own label markup, so the
 * required asterisks drifted and nothing rendered validation messages at all —
 * every failure surfaced as a single generic toast.
 */
export function FormField({
  id,
  label,
  required,
  error,
  hint,
  adornment,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className={cn(error && "text-destructive")}>
          {label}
          {required ? (
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          ) : (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span>
          )}
        </Label>
        {adornment}
      </div>

      {children}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-center gap-1.5 text-sm font-medium text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Border/ring override for a control whose field failed validation. */
export const invalidControlClass = (error?: string) =>
  error ? "border-destructive focus-visible:ring-destructive" : undefined;

/** `aria-describedby` target for a control, so screen readers announce the message. */
export const describedBy = (id: string, error?: string, hasHint?: boolean) =>
  error ? `${id}-error` : hasHint ? `${id}-hint` : undefined;

export default FormField;
