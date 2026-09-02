import { PRIMARY_DOMAIN } from "@/lib/constants";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

/**
 * Public landing page for students searching for the SRM AP student portal.
 * Most of that traffic just wants to check attendance without re-logging in
 * to student.srmap.edu.in every time — this page leads with that pain point
 * and the auto-sync feature that solves it, then funnels to sign-up.
 *
 * Every claim below (AES-256-GCM, Mon-Fri 5:30 PM IST sync, 75% rule) mirrors
 * the wording already shipped on /attendance and in the portal-link dialog,
 * so this page cannot drift from what the feature actually does.
 */
const SrmStudentPortal = () => {
  const faqs = [
    {
      q: "What is the SRM AP Student Portal?",
      a: "The SRM AP Student Portal (student.srmap.edu.in) is SRM University-AP's official system where students log in to view attendance, marks, timetables and academic records. Friendly Learning SRMAP is an independent, student-run tool that reads your attendance from it once you link your account — it does not replace or operate the official portal.",
    },
    {
      q: "Do I still need to log into the official portal every day?",
      a: "No. You link your account once, and our backend fetches your attendance automatically Monday through Friday at 5:30 PM IST. You only need to open the official portal yourself if you want something this page doesn't show, like marks or your timetable.",
    },
    {
      q: "Is my SRM AP student portal password safe?",
      a: "Yes. Your portal password is encrypted with AES-256-GCM before it's stored, and it's used only to fetch your own attendance — it is never logged in plaintext or shown to anyone, including our team.",
    },
    {
      q: "What is the SRM AP 75% attendance rule?",
      a: "Under SRM University-AP's academic regulations, students must maintain at least 75% attendance in each registered course to be eligible for the end-semester exam. Falling below it can mean an attendance condonation fine or semester detention.",
    },
    {
      q: "Can I see how many classes I can safely miss?",
      a: "Yes. Once your portal is linked, the Attendance page shows a safe-bunk count or classes-needed count per course, and lets you simulate attending or missing upcoming classes to see exactly how your percentage moves.",
    },
  ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((f) => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": { "@type": "Answer", "text": f.a },
    })),
  };

  return (
    <>
      <SEOHead
        title={ROUTE_META["/srm-ap-student-portal"].title}
        description={ROUTE_META["/srm-ap-student-portal"].description}
        keywords="srm ap student portal, srmap student portal, student portal srmap, SRM University-AP portal, srmap attendance, student.srmap.edu.in, SRM AP attendance sync, Friendly Learning SRMAP"
        canonical={`${PRIMARY_DOMAIN}/srm-ap-student-portal`}
        structuredData={structuredData}
      />

      <div className="min-h-screen">
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-6">
                  SRM AP Student Portal — Attendance, Auto-Synced
                </h1>
                <p className="text-xl text-muted-foreground">
                  Stop opening the SRM AP student portal every day just to check attendance.
                  Link your account once and Friendly Learning SRMAP keeps your numbers current
                  automatically.
                </p>
              </header>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                <div className="p-6 border rounded-lg">
                  <h3 className="text-xl font-bold mb-3">🔄 Auto-Synced, No Repeat Logins</h3>
                  <p>Link once, and we pull fresh attendance from the SRM AP student portal every weekday at 5:30 PM IST — no signing in and clicking through the portal's report each time.</p>
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="text-xl font-bold mb-3">🎯 75% Eligibility Tracking</h3>
                  <p>Every course shows your live attendance percentage against the mandatory 75% examination eligibility rule, with a safe-bunk or classes-needed count next to it.</p>
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="text-xl font-bold mb-3">🔔 Shortage Alerts</h3>
                  <p>If a course drops below 75%, you get notified the same evening — before it turns into a surprise at exam registration.</p>
                </div>
                <div className="p-6 border rounded-lg">
                  <h3 className="text-xl font-bold mb-3">🔒 Encrypted Credentials</h3>
                  <p>Your portal password is stored with AES-256-GCM encryption, never logged in plaintext, and used only to fetch your own attendance.</p>
                </div>
              </div>

              <div className="bg-muted p-8 rounded-lg mb-12">
                <h2 className="text-2xl font-bold mb-4">How Portal Attendance Sync Works</h2>
                <ol className="list-decimal list-inside space-y-3">
                  <li>Sign up free with your SRM AP email</li>
                  <li>Open Attendance and link your SRM AP student portal (register number + portal password)</li>
                  <li>We sync your attendance automatically, Monday–Friday at 5:30 PM IST</li>
                  <li>Get notified if any course falls below the 75% eligibility threshold</li>
                  <li>Re-sync manually anytime, or update your linked credentials from the same page</li>
                </ol>
              </div>

              <div className="text-center mb-16">
                <h2 className="text-2xl font-bold mb-4">Check Your Attendance Without the Portal Hassle</h2>
                <p className="mb-6">Free for every SRM AP student.</p>
                <div className="space-x-4">
                  <Button asChild size="lg">
                    <Link to="/signup">Link Your Portal — Sign Up Free</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/signin">Already Have an Account? Sign In</Link>
                  </Button>
                </div>
              </div>

              {/* FAQ */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
                <div className="divide-y divide-border border-t border-border">
                  {faqs.map((f) => (
                    <details key={f.q} className="group py-4">
                      <summary className="font-semibold cursor-pointer select-none list-none flex items-center justify-between gap-2">
                        <span>{f.q}</span>
                        <span className="text-muted-foreground transition-transform group-open:rotate-90 shrink-0">›</span>
                      </summary>
                      <p className="mt-2 text-muted-foreground leading-relaxed">{f.a}</p>
                    </details>
                  ))}
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center mt-10">
                Friendly Learning SRMAP is an independent, student-run project — not affiliated
                with or endorsed by SRM University-AP. "SRM AP Student Portal" refers to the
                university's own official system at student.srmap.edu.in; we only read your
                attendance from it once you choose to link your account.
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default SrmStudentPortal;
