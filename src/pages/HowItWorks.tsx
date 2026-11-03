import { PRIMARY_DOMAIN } from "@/lib/constants";

import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GraduationCap, Code, BookOpen, Rocket } from "lucide-react";

const STEPS = [
    {
        title: "Create your account",
        body: "Sign up with any email address, or continue with Google. No university email is needed, and it takes under a minute.",
    },
    {
        title: "Complete your profile",
        body: "Add your skills, courses, interests and academic details so the right people can find you.",
    },
    {
        title: "Connect and collaborate",
        body: "Find mentors, study partners and hackathon teammates, or help others with what you know.",
    },
];

const USES = [
    { icon: GraduationCap, title: "Get academic help", body: "Mentors and peers for course help, assignment guidance and exam preparation." },
    { icon: Code, title: "Build hackathon teams", body: "Developers, designers and business students for your next hackathon team." },
    { icon: BookOpen, title: "Form study groups", body: "Classmates to study with, in a group that keeps the conversation in one place." },
    { icon: Rocket, title: "Start projects", body: "Collaborators for startup ideas, research projects and side projects." },
];

const HowItWorks = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How Friendly Learning SRMAP Works - Student Collaboration Platform",
        "description": "Learn how Friendly Learning SRMAP connects university students for mentoring, study partnerships, hackathon teams, and academic collaboration",
        "url": `${PRIMARY_DOMAIN}/how-it-works`,
        "step": [
            {
                "@type": "HowToStep",
                "name": "Create Your Account",
                "text": "Sign up with any email address, or continue with Google. It takes under a minute."
            },
            {
                "@type": "HowToStep",
                "name": "Complete Your Profile",
                "text": "Add your skills, courses, interests, and academic information to help others find you."
            },
            {
                "@type": "HowToStep",
                "name": "Connect and Collaborate",
                "text": "Find mentors, study partners, hackathon teammates, or help others with your expertise."
            }
        ]
    };

    return (
        <>
            <SEOHead
                title={ROUTE_META["/how-it-works"].title}
                description={ROUTE_META["/how-it-works"].description}
                keywords="how Friendly Learning SRMAP works, university student collaboration guide, student mentoring platform, academic help process, Friendly Learning SRMAP tutorial"
                canonical={`${PRIMARY_DOMAIN}/how-it-works`}
                structuredData={structuredData}
            />

            <div className="min-h-screen bg-background">
                <main className="container px-4 pb-16 pt-16 md:px-6 md:pt-24">
                    <div className="mx-auto max-w-4xl">
                        <header className="max-w-2xl animate-fade-up">
                            <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                                How Friendly Learning works
                            </h1>
                            <p className="mt-4 text-lg text-muted-foreground">
                                Three steps from sign-up to working with the right people at SRM AP.
                            </p>
                        </header>

                        {/* Numbered steps: the sequence is the content, so it is shown as one */}
                        <ol className="mt-12 grid gap-10 border-t border-border pt-10 md:grid-cols-3 md:gap-12">
                            {STEPS.map((step, i) => (
                                <li key={step.title} className="min-w-0">
                                    <span className="tabular text-4xl font-semibold tracking-tight text-primary">
                                        {String(i + 1).padStart(2, "0")}
                                    </span>
                                    <h2 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                                </li>
                            ))}
                        </ol>

                        <section className="mt-16" aria-labelledby="hiw-uses">
                            <h2 id="hiw-uses" className="text-2xl font-semibold tracking-tight text-foreground">
                                What students use it for
                            </h2>
                            <dl className="mt-6 grid gap-x-10 border-t border-border sm:grid-cols-2">
                                {USES.map(({ icon: Icon, title, body }) => (
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

                        <section className="mt-16 rounded-xl border border-border bg-card p-6 shadow-card sm:p-8">
                            <h2 className="text-xl font-semibold tracking-tight text-foreground">Create your account</h2>
                            <p className="mt-2 text-muted-foreground">
                                Find the people at SRM AP who can help with what you are working on.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Button asChild size="lg">
                                    <Link to="/signup">Sign up</Link>
                                </Button>
                                <Button variant="outline" size="lg" asChild>
                                    <Link to="/mentors">Browse mentors</Link>
                                </Button>
                            </div>
                            <p className="mt-6 text-sm text-muted-foreground">
                                Wondering how mentor applications and certificates are checked?{" "}
                                <Link to="/how-verification-works" className="text-primary underline underline-offset-2">How verification works</Link>.
                            </p>
                        </section>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default HowItWorks;
