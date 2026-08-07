import { useMemo, useState } from "react";
import { Award, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MentorCertificate from "@/components/certificate/MentorCertificate";
import { MIN_STUDENTS_FOR_CERTIFICATE, sampleCertificate } from "@/lib/certificate";

interface CertificatePreviewProps {
  /** Shown on the sample so it reads as theirs rather than as stock artwork. */
  name: string;
  /** Collapsed contexts (e.g. a chat bubble) shouldn't unfold a full certificate unasked. */
  defaultOpen?: boolean;
}

/**
 * The certificate, shown on the application form as an incentive.
 *
 * Two rules this has to follow, or it does more harm than the motivation is
 * worth. It carries a SAMPLE watermark, and it states the bar directly
 * underneath. An unmarked certificate shown to someone who has helped nobody
 * would be a promise the platform has not yet kept — the same mistake as the
 * "reviewed within a few days" copy that used to sit on this form.
 *
 * Collapsed by default: someone halfway through a form does not need a full
 * certificate unfolding in front of them, but the offer should be visible.
 */
const CertificatePreview = ({ name, defaultOpen = true }: CertificatePreviewProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const data = useMemo(() => sampleCertificate(name), [name]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2.5 text-lg">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Award className="h-4 w-4" />
          </span>
          There's a certificate at the end of this
        </CardTitle>
        <CardDescription>
          Help {MIN_STUDENTS_FOR_CERTIFICATE} students and you earn a certificate recording what you
          actually did — how many students, which badges, how long you've been mentoring. It carries
          a link anyone can check, so it's worth putting on LinkedIn.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          {open ? "Hide the sample" : "See what it looks like"}
          <ChevronDown
            className={`ml-2 h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </Button>

        {open && (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border shadow-sm">
              <MentorCertificate data={data} />
            </div>
            <p className="text-xs text-muted-foreground">
              A sample with made-up figures. The real one is issued once you've had a genuine
              back-and-forth with {MIN_STUDENTS_FOR_CERTIFICATE} students — they have to reply, so
              it can't be earned by messaging people who never answer.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CertificatePreview;
