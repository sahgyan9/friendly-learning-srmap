import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Check, Copy, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import MentorCertificate from "@/components/certificate/MentorCertificate";
import {
  MyCertificateStatus,
  getMyCertificateStatus,
  issueCertificateIfEarned,
} from "@/integrations/supabase/services/certificates";
import {
  CertificateData,
  certificateVerifyUrl,
  downloadCertificatePng,
  sampleCertificate,
} from "@/lib/certificate";

const Certificate = () => {
  const { user, profile } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const [status, setStatus] = useState<MyCertificateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Issuing first means someone who crossed the threshold while away sees
      // the finished certificate on this visit rather than the next one. The RPC
      // is idempotent and does nothing if the bar has not been cleared.
      await issueCertificateIfEarned();
      const { data } = await getMyCertificateStatus();
      if (!cancelled) {
        setStatus(data);
        setLoading(false);
      }
    };

    if (user) load();
    else setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [user]);

  const name = profile?.name || "Your name";
  const earned = Boolean(status?.certificate_id) && !status?.revoked;

  const data: CertificateData = earned
    ? {
        name,
        department: profile?.department,
        university: "SRM University AP",
        studentsHelped: status!.students_helped,
        badges: status!.badges,
        mentorSince: status!.mentor_since,
        certificateNumber: status!.certificate_number!,
        issuedAt: status!.issued_at,
        verifyUrl: certificateVerifyUrl(status!.certificate_id!).replace(/^https?:\/\//, ""),
      }
    : sampleCertificate(name);

  const handleDownload = async () => {
    if (!svgRef.current) return;
    try {
      await downloadCertificatePng(
        svgRef.current,
        `friendly-learning-certificate-${status?.certificate_number ?? "sample"}.png`,
      );
    } catch {
      toast.error("Could not prepare the download. Try again in a moment.");
    }
  };

  const handleCopy = async () => {
    if (!status?.certificate_id) return;
    try {
      await navigator.clipboard.writeText(certificateVerifyUrl(status.certificate_id));
      setCopied(true);
      toast.success("Verification link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const helped = status?.students_helped ?? 0;
  const required = status?.students_required ?? 3;
  const remaining = Math.max(required - helped, 0);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Your mentor certificate | Friendly Learning"
        description="The certificate you earn by mentoring students at SRM AP."
      />

      <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold md:text-4xl">
            {earned ? "Your mentor certificate" : "The mentor certificate"}
          </h1>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            {earned
              ? "Every figure on it is counted from your actual activity, and anyone can check it at the link below."
              : "Earned by helping students, not by signing up. Here is what yours will look like."}
          </p>
        </div>

        {!status?.is_mentor && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">You're not listed as a mentor yet</CardTitle>
              <CardDescription>
                The certificate is for mentors. Listing yourself takes a few minutes and your
                profile goes live straight away.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/become-mentor">Help other students</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {status?.revoked && (
          <Card className="mb-8 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
            <CardHeader>
              <CardTitle className="text-lg text-red-800 dark:text-red-200">
                This certificate has been withdrawn
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300">
                Get in touch through the contact page if you think this is a mistake.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {status?.is_mentor && !earned && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                {remaining === 0
                  ? "Your certificate is being prepared"
                  : `${remaining} more ${remaining === 1 ? "student" : "students"} to go`}
              </CardTitle>
              <CardDescription>
                A student counts once you have had a real back-and-forth — you answered, and they
                replied. Opening a chat that nobody responds to does not count, which is what makes
                the number on the certificate worth something.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={(helped / required) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {helped} of {required} students helped
              </p>
              <Button asChild variant="outline">
                <Link to="/messages">Go to your messages</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="overflow-hidden rounded-xl border shadow-sm">
          <MentorCertificate ref={svgRef} data={data} />
        </div>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleDownload} disabled={!earned} size="lg">
            <Download className="mr-2 h-4 w-4" />
            Download as PNG
          </Button>
          <Button onClick={handleCopy} disabled={!earned} variant="outline" size="lg">
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy verification link
          </Button>
        </div>

        {!earned && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            This is a sample. The download unlocks once you've earned it.
          </p>
        )}
      </div>
    </div>
  );
};

export default Certificate;
