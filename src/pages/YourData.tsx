import { PRIMARY_DOMAIN } from "@/lib/constants";

import { Link } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DataRow {
  what: string;
  visibility: string;
  note: string;
}

const PUBLIC_ROWS: DataRow[] = [
  {
    what: "Mentor profile",
    visibility: "Public",
    note: "Name, department, skills, bio, LinkedIn, rating and review count — shown on your mentor listing.",
  },
  {
    what: "Faculty directory entries",
    visibility: "Public",
    note: "Name, designation, department and research interests, synced from SRM University-AP's own public directory.",
  },
  {
    what: "Community posts & public group posts",
    visibility: "Public",
    note: "Anything posted to the board or to a public group is readable by anyone, signed in or not.",
  },
  {
    what: "Mentor certificate",
    visibility: "Public, via its verify link",
    note: "The certificate number, issue date and impact figures are visible to anyone who opens the link — that's what makes the link worth sharing.",
  },
];

const PRIVATE_ROWS: DataRow[] = [
  {
    what: "Account details",
    visibility: "Private — you only",
    note: "Email, mobile number, College ID and CGPA live on your account row, which only you can read. No public page or search result shows them.",
  },
  {
    what: "Faculty email addresses",
    visibility: "Withheld from signed-out visitors",
    note: "Faculty emails are deliberately excluded from what an anonymous visitor can read, so the public directory can't be scraped for addresses.",
  },
  {
    what: "Direct messages",
    visibility: "Private — sender & recipient only",
    note: "Only the two people in a conversation can read it. Message content is never indexed by search or shown to anyone else.",
  },
  {
    what: "Private group posts & chat",
    visibility: "Private — members only",
    note: "A private group is discoverable by name so people can ask to join, but the posts and messages inside are readable only by members and never enter the public search index.",
  },
  {
    what: "Faculty reviews",
    visibility: "Anonymous by construction",
    note: "Your identity is stored only to stop double-voting and let you edit your own review — it is never returned alongside the review text, even to admins reading the review list.",
  },
];

/**
 * Every row above reflects a real system boundary (an RLS policy, a column
 * grant, or what does/doesn't get indexed for search) rather than a policy
 * promise. See T1.2's task report for the exact migration/line backing each
 * claim.
 */
const YourData = () => {
  return (
    <>
      <SEOHead
        title={ROUTE_META["/your-data"].title}
        description={ROUTE_META["/your-data"].description}
        keywords="Friendly Learning SRMAP privacy, what data is stored, public vs private, data removal request"
        canonical={`${PRIMARY_DOMAIN}/your-data`}
      />

      <div className="min-h-screen">
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">

              {/* ── Hero ── */}
              <header className="mb-10">
                <h1 className="text-4xl font-bold mb-6">Your Data</h1>
                <p className="text-lg text-muted-foreground">
                  A plain accounting of what Friendly Learning SRMAP stores, what's public
                  versus private, and how to have it removed. Friendly Learning SRMAP is an
                  independent student project — not affiliated with or endorsed by SRM
                  University-AP.
                </p>
              </header>

              {/* ── Public ── */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <Eye className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">What's public</h2>
                </div>
                <p className="text-lg mb-6">
                  Readable by anyone, signed in or not — this is the content the platform
                  exists to surface.
                </p>
                <div className="space-y-4">
                  {PUBLIC_ROWS.map((row) => (
                    <Card key={row.what}>
                      <CardHeader>
                        <CardTitle className="text-base">{row.what}</CardTitle>
                        <CardDescription>{row.note}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>

              {/* ── Private ── */}
              <section className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
                    <EyeOff className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-bold">What's private</h2>
                </div>
                <p className="text-lg mb-6">
                  Restricted to you, the people you're talking to, or nobody outside an
                  automated check.
                </p>
                <div className="space-y-4">
                  {PRIVATE_ROWS.map((row) => (
                    <Card key={row.what}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                          {row.what}
                        </CardTitle>
                        <CardDescription>{row.note}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>

              {/* ── Search ── */}
              <section className="mb-10">
                <h2 className="text-2xl font-bold mb-4">What search can and can't see</h2>
                <p className="text-lg mb-4">
                  CampusMind search only ever looks at what's already public — faculty
                  directory entries, mentor profiles, groups, posts in public groups, and
                  open opportunities. Direct messages, private group posts and private
                  group chat are never included, regardless of what you search for.
                </p>
              </section>

              {/* ── Removal ── */}
              <section className="mb-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Mail className="h-5 w-5 text-primary" />
                      Ask us to remove your data
                    </CardTitle>
                    <CardDescription>
                      Reach out through the contact page with your account email and what
                      you'd like removed. Someone reads every message that comes in through
                      there.
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

export default YourData;
