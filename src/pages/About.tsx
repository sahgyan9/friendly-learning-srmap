import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import TeamMembers from "@/components/about/TeamMembers";
import { FutureVision } from "@/components/FutureVision";
import StructuredData from "@/components/StructuredData";
import { getOrganizationSchema } from "@/lib/structured-data";
import { getTeamMembers, TeamMember } from "@/integrations/supabase/services/team-members";

const About = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await getTeamMembers();
      if (data) setTeamMembers(data);
    };
    load();
  }, []);

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is CampusMind?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "CampusMind is the AI search built into Friendly Learning SRMAP. Ask it a plain-English question — \"who's researching computer vision\" or \"I need a DSA mentor\" — and it searches peer mentors, faculty, groups, and posts together, instead of making you guess the right keyword.",
        },
      },
      {
        "@type": "Question",
        "name": "How is CampusMind different from a regular search bar?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A regular search bar matches keywords. CampusMind understands what you're actually asking, so a question like \"I'm stuck on my OS assignment\" surfaces the right peer mentors and study groups even if none of them used those exact words.",
        },
      },
      {
        "@type": "Question",
        "name": "What can I ask CampusMind?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Anything about campus — faculty by research area, peer mentors for a subject, hackathon teammates, active groups, or general questions about SRM AP.",
        },
      },
      {
        "@type": "Question",
        "name": "Is CampusMind free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. It's built into Friendly Learning SRMAP for every SRM AP student — no separate sign-up or subscription.",
        },
      },
    ],
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "About Friendly Learning SRMAP",
    "description": "Learn about Friendly Learning SRMAP — the complete campus ecosystem for SRM AP students to post ideas, find teammates, search using CampusMind, form groups, and earn recognition.",
    "mainEntity": {
      "@type": "Organization",
      "name": "Friendly Learning SRMAP",
      "description": "A complete campus ecosystem for SRM AP students: community posts, CampusMind natural-language search, peer mentors, faculty directory, private and public groups, and verified certificates.",
      "foundingDate": "2024",
      "serviceArea": "SRM University-AP",
      "mission": "Go from 'I have an idea' to 'I have a team' — without leaving campus.",
      "services": [
        "Community Posts & Team Building",
        "CampusMind Natural-Language Search",
        "Peer Mentorship & Certificates",
        "Faculty Directory & Research Matching",
        "Private and Public Group Workspaces",
        "Hackathon & Internship Opportunities"
      ],
      ...(teamMembers.length > 0 && {
        "member": teamMembers.map(m => ({
          "@type": "Person",
          "name": m.name,
          "jobTitle": m.position,
          ...(m.email && { "email": m.email }),
          ...(m.image_url && { "image": m.image_url })
        })),
        "founder": teamMembers.filter(m =>
          m.position.toLowerCase().includes('founder') ||
          m.position.toLowerCase().includes('lead') ||
          m.position.toLowerCase().includes('ceo')
        ).map(m => ({
          "@type": "Person",
          "name": m.name,
          "jobTitle": m.position,
          ...(m.image_url && { "image": m.image_url })
        }))
      })
    }
  };

  return (
    <>
      <SEOHead
        title={ROUTE_META["/about"].title}
        description={ROUTE_META["/about"].description}
        keywords="about Friendly Learning SRMAP, campus ecosystem SRM AP, CampusMind search, find hackathon partners, peer mentorship, faculty directory, student groups, community posts, team building"
        canonical={`${PRIMARY_DOMAIN}/about`}
      />

      <StructuredData data={structuredData} />
      <StructuredData data={getOrganizationSchema()} />
      <StructuredData data={faqData} />

      <div className="min-h-screen">
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">

              {/* ── Hero ── */}
              <header>
                <h1 className="text-4xl font-bold mb-6">About Friendly Learning SRMAP</h1>
              </header>
              <section className="mb-8">
                <p className="text-lg mb-6">
                  <strong>Friendly Learning SRMAP</strong> is a complete campus ecosystem for SRM University-AP students — not just a mentorship directory, but a full toolkit to help you find the right people, form teams, and turn ideas into outcomes.
                </p>
                <p className="text-lg mb-6">
                  The platform was built because finding the right person on campus — whether a senior who's taken your course, a professor who researches what you care about, or teammates for your next hackathon — used to mean asking around and hoping for luck. <strong>Friendly Learning makes that search specific, fast, and campus-wide.</strong>
                </p>
                <blockquote className="text-lg mb-4 italic text-muted-foreground border-l-4 border-primary pl-4">
                  "Go from <em>I have an idea</em> to <em>I have a team</em> — without leaving campus."
                </blockquote>
              </section>

              {/* ── Feature grid ── */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-6">Everything the Platform Does</h2>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="p-5 border rounded-xl">
                    <div className="text-3xl mb-3">💬</div>
                    <h3 className="text-lg font-bold mb-2">Community Posts</h3>
                    <p className="text-muted-foreground text-sm">Share what's on your mind. Post a call for hackathon teammates, a research collaborator, or a study partner. The campus community can reply, react, and connect with you directly.</p>
                  </div>
                  <div className="p-5 border rounded-xl">
                    <div className="text-3xl mb-3">🧠</div>
                    <h3 className="text-lg font-bold mb-2">CampusMind Search</h3>
                    <p className="text-muted-foreground text-sm">The smartest search on campus. Type a natural-language query — <em>"who knows computer vision for a research project"</em> — and CampusMind surfaces matching students and faculty together in one result.</p>
                  </div>
                  <div className="p-5 border rounded-xl">
                    <div className="text-3xl mb-3">🎓</div>
                    <h3 className="text-lg font-bold mb-2">Peer Mentors</h3>
                    <p className="text-muted-foreground text-sm">
                      Senior students who've taken your exact courses. Message them directly for course help, project feedback, or career advice. Mentors who genuinely help 3 students earn a verified certificate — see{" "}
                      <Link to="/how-verification-works" className="text-primary underline underline-offset-2">how verification works</Link>.
                    </p>
                  </div>
                  <div className="p-5 border rounded-xl">
                    <div className="text-3xl mb-3">👨‍🏫</div>
                    <h3 className="text-lg font-bold mb-2">Faculty Directory</h3>
                    <p className="text-muted-foreground text-sm">The full SRM AP faculty catalogue with research interests, department, and ratings. Find the right professor for your next project, paper, or elective decision — before you commit.</p>
                  </div>
                  <div className="p-5 border rounded-xl">
                    <div className="text-3xl mb-3">🏠</div>
                    <h3 className="text-lg font-bold mb-2">Groups & Workspaces</h3>
                    <p className="text-muted-foreground text-sm">Once you find your people, create a group. Private groups for your team to plan and coordinate. Public groups for communities of interest. Start the conversation and work toward the win together.</p>
                  </div>
                  <div className="p-5 border rounded-xl">
                    <div className="text-3xl mb-3">🚀</div>
                    <h3 className="text-lg font-bold mb-2">Opportunities</h3>
                    <p className="text-muted-foreground text-sm">Hackathons, internships, and research calls — posted by students and faculty across campus. Filter by type, find what matches your skills, and form your team right on the platform.</p>
                  </div>
                </div>
              </section>

              {/* ── What is CampusMind ── */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-6">What is CampusMind?</h2>
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-bold mb-1.5">What is CampusMind?</h3>
                    <p className="text-muted-foreground text-sm">
                      CampusMind is the AI search built into Friendly Learning SRMAP. Ask it a plain-English question — <em>"who's researching computer vision"</em> or <em>"I need a DSA mentor"</em> — and it searches peer mentors, faculty, groups, and posts together, instead of making you guess the right keyword.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1.5">How is CampusMind different from a regular search bar?</h3>
                    <p className="text-muted-foreground text-sm">
                      A regular search bar matches keywords. CampusMind understands what you're actually asking, so a question like <em>"I'm stuck on my OS assignment"</em> surfaces the right peer mentors and study groups even if none of them used those exact words.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1.5">What can I ask CampusMind?</h3>
                    <p className="text-muted-foreground text-sm">
                      Anything about campus — faculty by research area, peer mentors for a subject, hackathon teammates, active groups, or general questions about SRM AP.
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-1.5">Is CampusMind free to use?</h3>
                    <p className="text-muted-foreground text-sm">
                      Yes. It's built into Friendly Learning SRMAP for every SRM AP student — no separate sign-up or subscription.
                    </p>
                  </div>
                </div>
              </section>

              {/* ── Mission ── */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-lg mb-6">
                  Every student has an idea, a question, or a goal — and somewhere on campus, the right person exists to help with it. Our mission is to close that gap: make finding that person as easy as typing a sentence, and make working with them as natural as starting a group chat. We believe the best help comes from people who've been exactly where you are, and the best teams form when the right people can actually find each other.
                </p>
              </section>

              {/* ── How it works ── */}
              <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4">
                    <div className="text-4xl mb-4">📝</div>
                    <h3 className="text-xl font-bold mb-2">Post or Search</h3>
                    <p className="text-sm text-muted-foreground">Post what you're looking for on the community board, or use CampusMind to search in plain English — <em>"ML researcher for a CV project"</em> — and get matched instantly.</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl mb-4">🤝</div>
                    <h3 className="text-xl font-bold mb-2">Find & Connect</h3>
                    <p className="text-sm text-muted-foreground">Browse mentor profiles, faculty research pages, or group listings. Message a mentor directly, or reach out to collaborators who replied to your post.</p>
                  </div>
                  <div className="text-center p-4">
                    <div className="text-4xl mb-4">🏆</div>
                    <h3 className="text-xl font-bold mb-2">Form a Group & Win</h3>
                    <p className="text-sm text-muted-foreground">Once you have your people, start a private or public group workspace. Plan, coordinate, build — and submit that hackathon project, research paper, or startup pitch together.</p>
                  </div>
                </div>
              </section>

              {/* ── Future Vision & Roadmap ── */}
              <div className="-mx-4 md:-mx-6 mb-12">
                <FutureVision />
              </div>

              {/* ── CTA ── */}
              <section className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4">Ready to find your people?</h2>
                <p className="text-lg mb-6 text-muted-foreground">
                  Your next mentor, research partner, or hackathon team is already on campus. Start with a post, a search, or browsing what's out there.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button asChild size="lg">
                    <Link to="/ask">Search with CampusMind</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/posts">Browse Posts</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/mentors">Find a Mentor</Link>
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-6">
                  Curious what we store and how verification works?{" "}
                  <Link to="/your-data" className="text-primary underline underline-offset-2">See your data</Link>.
                </p>
              </section>

            </div>
          </div>
        </main>
        <TeamMembers teamMembers={teamMembers} />
        <Footer />
      </div>
    </>
  );
};

export default About;
