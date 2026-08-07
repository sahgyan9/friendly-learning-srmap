import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Check, Copy, Download, Loader2, MessageSquare, UserCircle } from "lucide-react";
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
        title="The mentor certificate | Friendly Learning SRMAP"
        description="A verifiable certificate SRM AP students earn by actually helping juniors — three real conversations, a public verification link, and no application form."
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

        {/* The preview leads. Someone who has just arrived from the homepage has
            no idea what this thing is, and no amount of copy explains it as
            quickly as showing it. Everything about earning it comes after. */}
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

        {!earned && (
          <div className="mt-14">
            <h2 className="mb-2 text-center text-2xl font-bold">How it's earned</h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-muted-foreground">
              There is no application and no button that grants it. It follows
              from helping people, which is the only reason it means anything.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <UserCircle className="h-5 w-5 text-primary" />
                    1. Be findable
                  </CardTitle>
                  <CardDescription>
                    Nobody can ask you for help if they can't find you. Your
                    profile is what puts you in search — by subject, skill and
                    year — when a junior goes looking for someone who has already
                    taken their course.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    2. Actually help
                  </CardTitle>
                  <CardDescription>
                    A student counts once you've had a real back-and-forth — you
                    answered, and they replied. A chat nobody responds to doesn't
                    count, which is exactly what keeps the number honest.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-5 w-5 text-primary" />
                    3. It issues itself
                  </CardTitle>
                  <CardDescription>
                    After {required} real exchanges the certificate appears here
                    on its own, carrying a public verification link that anyone —
                    a recruiter, a professor — can check without an account.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        )}

        {/* Signed-out visitors get the one step that is actually theirs to take.
            /become-mentor is behind ProtectedRoute, so sending them there would
            just bounce them to sign-in with no explanation. */}
        {!user && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-lg">Start with a profile</CardTitle>
              <CardDescription>
                It takes a few minutes and you're listed straight away. The
                helping — and the certificate — follows from there.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/signup">Set up your profile</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/mentors">See who's already listed</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {user && !status?.is_mentor && (
          <Card className="mt-8">
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
          <Card className="mt-8 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40">
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
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                {remaining === 0
                  ? "Your certificate is being prepared"
                  : `${remaining} more ${remaining === 1 ? "student" : "students"} to go`}
              </CardTitle>
              <CardDescription>
                Your progress so far. Every one of these is a conversation that
                went both ways.
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
      </div>
    </div>
  );
};

export default Certificate;
