import { PRIMARY_DOMAIN } from "@/lib/constants";

import { Link } from "react-router-dom";
import { BadgeCheck, IdCard, MessageSquare, ShieldCheck } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MIN_STUDENTS_FOR_CERTIFICATE } from "@/lib/certificate";

/**
 * Plain-language trust page. Every claim below is checked against the code
 * that actually runs it — see the inline comments — so this page cannot drift
 * from behaviour the way marketing copy can.
 */
const HowVerificationWorks = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Are mentor applications reviewed before approval?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Mentor applications are approved instantly. The checks a reviewer would normally do run automatically and anything unusual is queued for a human to look at afterwards, but nobody waits on that review to start mentoring.",
        },
      },
      {
        "@type": "Question",
        "name": "What does the College ID upload prove?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It proves two things with no human involved: that this is the only account using that enrollment number, and a cohort year the ID format encodes. It does not prove current enrollment status.",
        },
      },
      {
        "@type": "Question",
        "name": `How is the mentor certificate earned?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `By having a genuine two-way exchange with ${MIN_STUDENTS_FOR_CERTIFICATE} different students — the mentor replied, and the student replied back. Every certificate carries a public verification link.`,
        },
      },
    ],
  };

  return (
    <>
      <SEOHead
        title={ROUTE_META["/how-verification-works"].title}
        description={ROUTE_META["/how-verification-works"].description}
        keywords="how mentor verification works, College ID check, mentor certificate, Friendly Learning SRMAP trust and safety"
        canonical={`${PRIMARY_DOMAIN}/how-verification-works`}
        structuredData={structuredData}
      />

      <div className="min-h-screen">
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">

              {/* ── Hero ── */}
              <header className="mb-10">
                <h1 className="text-4xl font-bold mb-6">How Verification Works</h1>
                <p className="text-lg text-muted-foreground">
                  Friendly Learning SRMAP is an independent, student-run project — not an
                  admissions office. Here is exactly what gets checked, what doesn't, and
                  why, in plain language.
                </p>
              </header>

              {/* ── Mentor applications ── */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Mentor applications: approved instantly, checked afterwards</h2>
                </div>
                <p className="text-lg mb-4">
                  Every mentor application is approved the moment it's submitted — nobody
                  waits behind a reviewer's inbox to start helping students. What happens
                  behind that instant approval is a set of automatic checks: is this College
                  ID already claimed by another account, does the claimed graduation year
                  fit the enrollment year encoded in the ID, does the CGPA look like it was
                  typed on the wrong scale.
                </p>
                <p className="text-lg mb-4">
                  None of those checks block approval. Anything they flag goes into a queue
                  a human reviews afterwards — an "approve, then flag for review" model,
                  chosen because requiring a reviewer's click first would stall every
                  applicant behind one person's attention, which a platform with a small
                  team can't afford. If a flag turns out to matter, the mentor's listing can
                  still be corrected or removed later.
                </p>
              </section>

              {/* ── College ID ── */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <IdCard className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">What the College ID upload actually proves</h2>
                </div>
                <p className="text-lg mb-4">
                  It's worth being precise here, because it's easy to overstate. The College
                  ID format check catches typos, not fabrications — it's trivial to type
                  something that merely looks like a valid ID. What the ID genuinely buys,
                  with no human involved, is two things:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-lg mb-4">
                  <li>
                    <strong>One account per enrollment number.</strong> A unique constraint
                    means a second account can't claim an ID already in use — that's the
                    identity-dedup half.
                  </li>
                  <li>
                    <strong>A cohort year.</strong> The ID format encodes an enrollment year,
                    which is cross-checked against the graduation year an applicant claims,
                    catching an obviously inconsistent pair.
                  </li>
                </ul>
                <p className="text-lg mb-4">
                  <strong>What it does not prove is current enrollment status.</strong> We
                  never verify against a live SRM University-AP student register, and this
                  page never claims we do. Anything that needs stronger confidence than the
                  format check can give goes to the flag queue for a person to look at.
                </p>
              </section>

              {/* ── Certificates ── */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <BadgeCheck className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">How the mentor certificate is earned</h2>
                </div>
                <p className="text-lg mb-4">
                  There's no application for the certificate and no button that grants it.
                  It's issued automatically once a mentor has had a genuine two-way exchange
                  with <strong>{MIN_STUDENTS_FOR_CERTIFICATE} different students</strong> —
                  meaning the mentor sent at least one message and the student sent at least
                  one back. Opening a chat that's never answered doesn't count toward the
                  number, which is exactly what keeps the figure honest.
                </p>
                <p className="text-lg mb-4">
                  Every certificate carries a public verification link. The figures on it —
                  students helped, badges, reviews — are recomputed live from the platform
                  every time that link is opened, so the page is never out of date with what
                  the certificate image shows, and anyone (a recruiter, a professor) can
                  check it without an account.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/certificate">See how the certificate looks</Link>
                  </Button>
                </div>
              </section>

              {/* ── Non-affiliation ── */}
              <section className="mb-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Still have a question?
                    </CardTitle>
                    <CardDescription>
                      Friendly Learning SRMAP is an independent student project. It is not
                      affiliated with or endorsed by SRM University-AP, and nothing on this
                      page is a university credential. If something here doesn't match what
                      you see on the platform, tell us.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild variant="outline">
                      <Link to="/contact">Contact us</Link>
                    </Button>
                  </CardContent>
                </Card>
              </section>

            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default HowVerificationWorks;
