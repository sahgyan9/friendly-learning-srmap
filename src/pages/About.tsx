import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import TeamMembers from "@/components/about/TeamMembers";
import { FutureVision } from "@/components/FutureVision";
import StructuredData from "@/components/StructuredData";
import { getOrganizationSchema } from "@/lib/structured-data";
import { OPEN_SEARCH_EVENT } from "@/lib/search/events";
import { getTeamMembers, TeamMember } from "@/integrations/supabase/services/team-members";
import { MessageSquare, GraduationCap, BookOpen, Users, Trophy, Search, type LucideIcon } from "lucide-react";

const FEATURES: { icon: LucideIcon; title: string; body: ReactNode }[] = [
  {
    icon: MessageSquare,
    title: "Community posts",
    body: "Post a call for hackathon teammates, a research collaborator or a study partner. Other students can reply, react and message you directly.",
  },
  {
    icon: Search,
    title: "CampusBrain search",
    body: (
      <>
        Type a plain-English query, such as <em>who knows computer vision for a research project</em>, and CampusBrain
        returns matching students and faculty together, with the sources for every answer.
      </>
    ),
  },
  {
    icon: GraduationCap,
    title: "Peer mentors",
    body: (
      <>
        Seniors who have taken your courses. Message them for course help, project feedback or career advice. Mentors
        who help three students earn a verified certificate; see{" "}
        <Link to="/how-verification-works" className="text-primary underline underline-offset-2">
          how verification works
        </Link>
        .
      </>
    ),
  },
  {
    icon: BookOpen,
    title: "Faculty directory",
    body: "Every SRM AP faculty member with research interests, department and student ratings, so you can pick a professor for a project, paper or elective before you commit.",
  },
  {
    icon: Users,
    title: "Groups and workspaces",
    body: "Private groups for your team to plan and coordinate, public groups for shared interests. Start the conversation and do the work together.",
  },
  {
    icon: Trophy,
    title: "Opportunities",
    body: "Hackathons, internships and research calls posted by students and faculty. Filter by type, find what fits your skills and form a team here.",
  },
];

const STEPS: { title: string; body: ReactNode }[] = [
  {
    title: "Post or search",
    body: (
      <>
        Post what you are looking for, or ask CampusBrain in plain English, such as <em>ML researcher for a CV project</em>.
      </>
    ),
  },
  {
    title: "Find and connect",
    body: "Read mentor profiles, faculty research pages or group listings. Message a mentor, or reply to the people who answered your post.",
  },
  {
    title: "Form a group and ship",
    body: "Start a private or public group to plan and build, then submit the hackathon project, paper or pitch together.",
  },
];

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
        "name": "What is CampusBrain?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "CampusBrain is the AI search built into Friendly Learning SRMAP. Ask it a plain-English question — \"who's researching computer vision\" or \"I need a DSA mentor\" — and it searches peer mentors, faculty, groups, and posts together, instead of making you guess the right keyword.",
        },
      },
      {
        "@type": "Question",
        "name": "How is CampusBrain different from a regular search bar?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A regular search bar matches keywords. CampusBrain understands what you're actually asking, so a question like \"I'm stuck on my OS assignment\" surfaces the right peer mentors and study groups even if none of them used those exact words.",
        },
      },
      {
        "@type": "Question",
        "name": "What can I ask CampusBrain?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Anything about campus — faculty by research area, peer mentors for a subject, hackathon teammates, active groups, or general questions about SRM AP.",
        },
      },
      {
        "@type": "Question",
        "name": "Is CampusBrain free to use?",
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
    "description": "Learn about Friendly Learning SRMAP — the complete campus ecosystem for SRM AP students to post ideas, find teammates, search using CampusBrain, form groups, and earn recognition.",
    "mainEntity": {
      "@type": "Organization",
      "name": "Friendly Learning SRMAP",
      "description": "A complete campus ecosystem for SRM AP students: community posts, CampusBrain natural-language search, peer mentors, faculty directory, private and public groups, and verified certificates.",
      "foundingDate": "2024",
      "serviceArea": "SRM University-AP",
      "mission": "Go from 'I have an idea' to 'I have a team' — without leaving campus.",
      "services": [
        "Community Posts & Team Building",
        "CampusBrain Natural-Language Search",
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
        keywords="about Friendly Learning SRMAP, campus ecosystem SRM AP, CampusBrain search, find hackathon partners, peer mentorship, faculty directory, student groups, community posts, team building"
        canonical={`${PRIMARY_DOMAIN}/about`}
      />

      <StructuredData data={structuredData} />
      <StructuredData data={getOrganizationSchema()} />
      <StructuredData data={faqData} />

      <div className="min-h-screen bg-background">
        <div className="container px-4 pb-16 pt-16 md:px-6 md:pt-24">
          <div className="mx-auto max-w-4xl">
            {/* Lead */}
            <header className="max-w-3xl animate-fade-up">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                About Friendly Learning
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Friendly Learning is a campus platform for SRM University-AP students. It helps you find the right
                people, form teams and turn ideas into finished work.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Finding the right person on campus used to mean asking around: a senior who has taken your course, a
                professor who researches what you care about, teammates for the next hackathon.{" "}
                <span className="font-medium text-foreground">Friendly Learning makes that search specific, fast and campus-wide.</span>
              </p>
              <blockquote className="mt-8 border-l-2 border-primary pl-4 text-lg text-foreground">
                Go from <em>I have an idea</em> to <em>I have a team</em>, without leaving campus.
              </blockquote>
            </header>

            {/* What it does: a definition list reads faster than six icon cards */}
            <section className="mt-16" aria-labelledby="about-features">
              <h2 id="about-features" className="text-2xl font-semibold tracking-tight text-foreground">
                What the platform does
              </h2>
              <dl className="mt-6 grid gap-x-10 border-t border-border sm:grid-cols-2">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="min-w-0 border-b border-border py-6">
                    <dt className="flex items-center gap-2 font-semibold text-foreground">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      {title}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* CampusBrain questions mirror the FAQ structured data above */}
            <section className="mt-16" aria-labelledby="about-campusbrain">
              <h2 id="about-campusbrain" className="text-2xl font-semibold tracking-tight text-foreground">
                CampusBrain questions
              </h2>
              <dl className="mt-6 divide-y divide-border border-y border-border">
                <div className="grid gap-2 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
                  <dt className="font-medium text-foreground">What is CampusBrain?</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">
                    CampusBrain is the search built into Friendly Learning. Ask it a plain-English question, such as{" "}
                    <em>who is researching computer vision</em> or <em>I need a DSA mentor</em>, and it searches peer
                    mentors, faculty, groups and posts together, so you do not have to guess the right keyword.
                  </dd>
                </div>
                <div className="grid gap-2 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
                  <dt className="font-medium text-foreground">How is it different from a regular search bar?</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">
                    A regular search bar matches keywords. CampusBrain matches meaning, so{" "}
                    <em>I am stuck on my OS assignment</em> finds the right peer mentors and study groups even if none
                    of them used those exact words. Answers cite the profiles and posts they come from.
                  </dd>
                </div>
                <div className="grid gap-2 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
                  <dt className="font-medium text-foreground">What can I ask it?</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">
                    Anything about campus: faculty by research area, peer mentors for a subject, hackathon teammates,
                    active groups, or general questions about SRM AP.
                  </dd>
                </div>
                <div className="grid gap-2 py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
                  <dt className="font-medium text-foreground">Is it free?</dt>
                  <dd className="text-sm leading-relaxed text-muted-foreground">
                    Yes. It is part of Friendly Learning for every SRM AP student, with no separate sign-up or subscription.
                  </dd>
                </div>
              </dl>
            </section>

            <section className="mt-16 max-w-3xl" aria-labelledby="about-mission">
              <h2 id="about-mission" className="text-2xl font-semibold tracking-tight text-foreground">
                Why we built it
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                Every student has an idea, a question or a goal, and somewhere on campus the right person exists to help
                with it. We want finding that person to be as easy as typing a sentence, and working with them as
                natural as starting a group chat. The best help comes from people who have been exactly where you are,
                and the best teams form when the right people can find each other.
              </p>
            </section>

            {/* Numbered steps: the order is the point */}
            <section className="mt-16" aria-labelledby="about-steps">
              <h2 id="about-steps" className="text-2xl font-semibold tracking-tight text-foreground">
                How it works
              </h2>
              <ol className="mt-6 grid gap-8 border-t border-border pt-8 md:grid-cols-3 md:gap-10">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="min-w-0">
                    <span className="tabular text-sm font-semibold text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3 className="mt-2 text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>

        <FutureVision />

        <TeamMembers teamMembers={teamMembers} />

        <section className="border-t border-border py-16 md:py-20">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
                Find your mentor, research partner or team
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                Start with a search, a post, or a look through the mentor list.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))}
                >
                  <Search aria-hidden />
                  Search campus
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/posts">Browse posts</Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/mentors">Find a mentor</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Want to know what we store and how verification works?{" "}
                <Link to="/your-data" className="text-primary underline underline-offset-2">See your data</Link>.
              </p>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default About;
