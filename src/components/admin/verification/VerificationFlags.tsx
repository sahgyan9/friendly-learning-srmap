import { AlertTriangle, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { describeFlag, highestSeverity } from "@/lib/mentor-flags";

interface VerificationFlagsProps {
  flags: string[] | null | undefined;
  /** Compact renders badges only, for list rows. */
  variant?: "full" | "compact";
}

/**
 * Applications are approved on submission, so this panel is the only place the
 * automated checks surface. It has to say what to do about each flag, not just
 * name it — an admin reading "college_id_duplicate" learns nothing actionable.
 */
const VerificationFlags = ({ flags, variant = "full" }: VerificationFlagsProps) => {
  const severity = highestSeverity(flags);
  if (!severity || !flags) return null;

  const definitions = flags.map((flag) => ({ flag, ...describeFlag(flag) }));

  if (variant === "compact") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {definitions.map(({ flag, label, severity: flagSeverity }) => (
          <Badge
            key={flag}
            variant="outline"
            className={
              flagSeverity === "warning"
                ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                : "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200"
            }
          >
            {label}
          </Badge>
        ))}
      </div>
    );
  }

  const isWarning = severity === "warning";

  return (
    <div
      className={`rounded-lg border p-4 ${
        isWarning
          ? "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
          : "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
      }`}
    >
      <div className="flex items-center gap-2">
        {isWarning ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <Info className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        )}
        <h4 className="text-sm font-semibold">
          {isWarning ? "Approved, but worth checking" : "Approved — minor notes"}
        </h4>
      </div>

      <ul className="mt-3 space-y-2.5">
        {definitions.map(({ flag, label, detail }) => (
          <li key={flag} className="text-sm">
            <span className="font-medium">{label}.</span>{" "}
            <span className="text-muted-foreground">{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default VerificationFlags;
