import { Phone, Mail, HeartPulse, Shield } from "lucide-react";
import { useWellbeingSettings, buildCounsellorMailto } from "@/hooks/useWellbeingSettings";

interface WellbeingHelpCardProps {
  /** Optional title override, default is calm guidance */
  title?: string;
  /** Compact style for modals vs full card for feeds */
  compact?: boolean;
}

export function WellbeingHelpCard({
  title = "Support is always available",
  compact = false,
}: WellbeingHelpCardProps) {
  const { teleManasNumber, counsellors, adminPhone, adminLabel, loading } = useWellbeingSettings();

  return (
    <div
      role="region"
      aria-label="Well-being support and crisis resources"
      className={`rounded-xl border border-blue-200/80 bg-blue-50/50 p-4 text-foreground transition-colors dark:border-blue-900/50 dark:bg-blue-950/20 ${
        compact ? "space-y-3 text-sm" : "space-y-4"
      }`}
    >
      {/* Calm header */}
      <div className="flex items-start gap-2.5">
        <HeartPulse className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" aria-hidden="true" />
        <div>
          <h4 className="font-semibold text-foreground text-sm sm:text-base leading-snug">{title}</h4>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-relaxed">
            If you are going through a difficult time, you do not have to carry it alone. These resources are confidential and free.
          </p>
        </div>
      </div>

      <div className="space-y-3 pt-1">
        {/* 1. Tele-MANAS (24x7 Government Helpline) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border bg-background/80 p-3 shadow-xs">
          <div className="space-y-0.5">
            <div className="font-medium text-foreground text-sm">Tele-MANAS</div>
            <div className="text-xs text-muted-foreground">
              Free, 24x7, confidential government tele-mental health helpline
            </div>
          </div>
          <a
            href={`tel:${teleManasNumber}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring shrink-0 w-full sm:w-auto"
            aria-label={`Call Tele-MANAS at ${teleManasNumber}`}
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Call {teleManasNumber}</span>
          </a>
        </div>

        {/* 2. SRM University-AP Wellness Centre Counsellors (Database-driven, hidden if empty) */}
        {!loading && counsellors.length > 0 && (
          <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2.5 shadow-xs">
            <div className="space-y-0.5">
              <div className="font-medium text-foreground text-sm">
                SRM University-AP Wellness Centre
              </div>
              <div className="text-xs text-muted-foreground">
                Talk to a university counsellor in confidence.
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {counsellors.map((counsellor) => {
                const mailtoUrl = buildCounsellorMailto(counsellor);
                return (
                  <div
                    key={counsellor.email}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 first:pt-1 last:pb-0"
                  >
                    <span className="text-xs sm:text-sm font-medium text-foreground">
                      {counsellor.name}
                    </span>
                    <a
                      href={mailtoUrl}
                      className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring shrink-0 w-full sm:w-auto"
                      aria-label={`Send confidential email to ${counsellor.name}`}
                    >
                      <Mail className="h-3 w-3" aria-hidden="true" />
                      <span>Email</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Friendly Learning Admin Line (Database-driven, quiet label, hidden if empty) */}
        {!loading && adminPhone && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span>{adminLabel || "Friendly Learning admin, for app or safety issues (not a counselling line)"}</span>
            </div>
            <a
              href={`tel:${adminPhone}`}
              className="inline-flex items-center justify-center gap-1 font-medium text-primary hover:underline shrink-0"
            >
              <Phone className="h-3 w-3" aria-hidden="true" />
              <span>Call admin</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
