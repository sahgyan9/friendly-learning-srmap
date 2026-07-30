import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Loader2, ShieldAlert, ShieldX } from "lucide-react";

import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MentorCertificate from "@/components/certificate/MentorCertificate";
import {
  PublicCertificate,
  getCertificate,
} from "@/integrations/supabase/services/certificates";
import { certificateVerifyUrl, formatCertificateDate, formatMonthYear } from "@/lib/certificate";

/**
 * The public side of the certificate, and the reason it is worth more than an
 * image. Deliberately readable without an account: a recruiter checking a link
 * from a CV will not sign up first.
 *
 * The figures shown here are recomputed on every request, so a certificate
 * downloaded a year ago and this page can differ — and this page is the one that
 * is true.
 */
const VerifyCertificate = () => {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<PublicCertificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      const { data } = await getCertificate(id);
      if (!cancelled) {
        setCertificate(data);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // A malformed id and an id that simply does not exist get the same answer, so
  // this page cannot be used to work out which certificates are real.
  if (!certificate) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead
          title="Certificate not found | Friendly Learning"
          description="Verify a Friendly Learning mentor certificate."
        />
        <div className="container mx-auto max-w-2xl px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldX className="h-5 w-5 text-muted-foreground" />
                No certificate matches this link
              </CardTitle>
              <CardDescription>
                Check the link was copied in full. Friendly Learning certificates are issued only
                to mentors who have helped students on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link to="/">Go to Friendly Learning</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const verified = !certificate.revoked;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${certificate.name} — mentor certificate | Friendly Learning`}
        description={`Verified: ${certificate.name} has helped ${certificate.students_helped} students as a mentor at SRM University AP.`}
      />

      <div className="container mx-auto max-w-5xl px-4 py-12 md:py-16">
        <Card
          className={
            verified
              ? "mb-8 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
              : "mb-8 border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
          }
        >
          <CardHeader>
            <CardTitle
              className={
                verified
                  ? "flex items-center gap-2 text-green-800 dark:text-green-200"
                  : "flex items-center gap-2 text-amber-800 dark:text-amber-200"
              }
            >
              {verified ? <BadgeCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
              {verified ? "This certificate is genuine" : "This certificate has been withdrawn"}
            </CardTitle>
            <CardDescription
              className={
                verified
                  ? "text-green-700 dark:text-green-300"
                  : "text-amber-700 dark:text-amber-300"
              }
            >
              {verified
                ? `Issued by Friendly Learning on ${formatCertificateDate(certificate.issued_at)}. The figures below are counted live from the platform, not from the image.`
                : "It was issued by Friendly Learning but has since been withdrawn, so it should not be treated as current."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Certificate", value: certificate.certificate_number },
                { label: "Students helped", value: String(certificate.students_helped) },
                { label: "Badges earned", value: String(certificate.badges) },
                { label: "Mentor since", value: formatMonthYear(certificate.mentor_since) },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="mt-1 font-semibold tabular-nums">{item.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-xl border shadow-sm">
          <MentorCertificate
            data={{
              name: certificate.name,
              department: certificate.department,
              university: certificate.university,
              studentsHelped: certificate.students_helped,
              badges: certificate.badges,
              mentorSince: certificate.mentor_since,
              certificateNumber: certificate.certificate_number,
              issuedAt: certificate.issued_at,
              verifyUrl: certificateVerifyUrl(id!).replace(/^https?:\/\//, ""),
            }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Friendly Learning is a student-run mentorship platform at SRM University AP. This
          certificate records volunteer mentoring on the platform and is not a university
          qualification.
        </p>
      </div>
    </div>
  );
};

export default VerifyCertificate;
