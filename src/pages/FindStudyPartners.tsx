import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Target, BookOpen, Users, Clock } from "lucide-react";

const FEATURES = [
    {
        icon: Target,
        title: "Same-course partners",
        body: "Find students taking the same courses for focused study sessions and assignment help.",
    },
    {
        icon: BookOpen,
        title: "Study groups",
        body: "Start or join a group with students who share your goals and schedule.",
    },
    {
        icon: Users,
        title: "Skill exchange",
        body: "Help others in subjects you are strong in and get help where you need it.",
    },
    {
        icon: Clock,
        title: "Matching schedules",
        body: "Find students who are free when you are for sessions and group meetings.",
    },
];

const STEPS = [
    "Sign up with any email, or continue with Google",
    "Add your courses, subjects and study preferences",
    "Search for students by course, major or topic",
    "Message them to arrange a session, or join a group",
    "Post on the board when you need help with something specific",
];

const FindStudyPartners = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Find Study Partners at SRM AP - Friendly Learning SRMAP",
        "description": "Connect with study partners at SRM University-AP through Friendly Learning SRMAP. Find students in your courses, form study groups, and improve your academic performance together.",
        "url": `${PRIMARY_DOMAIN}/find-study-partners`,
        "mainEntity": {
            "@type": "Service",
            "name": "University Study Partner Matching",
            "provider": {
                "@type": "Organization",
                "name": "Friendly Learning SRMAP"
            },
            "serviceType": "Educational Networking",
            "areaServed": "SRM University-AP"
        }
    };

    return (
        <>
            <SEOHead
                title={ROUTE_META["/find-study-partners"].title}
                description={ROUTE_META["/find-study-partners"].description}
                keywords="find study partners university, university study groups, student collaboration, academic study partners, college study buddies, Friendly Learning SRMAP study partners, university networking"
                canonical={`${PRIMARY_DOMAIN}/find-study-partners`}
                structuredData={structuredData}
            />

            <div className="min-h-screen bg-background">
                <main className="pb-16 pt-24">
                    <div className="container px-4 md:px-6">
                        <div className="mx-auto max-w-4xl">
                            <header className="mb-10 animate-fade-up">
                                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Find study partners at SRM AP</h1>
                                <p className="mt-3 max-w-2xl text-base text-muted-foreground">
                                    Meet students taking the same courses as you, form study groups, and trade help in the subjects you each know best.
                                </p>
                            </header>

                            <div className="mb-10 grid gap-4 md:grid-cols-2">
                                {FEATURES.map(({ icon: Icon, title, body }) => (
                                    <div key={title} className="flex gap-4 rounded-xl border border-border bg-card p-5 shadow-card">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-5 w-5 text-foreground" />
                                        </span>
                                        <div className="min-w-0">
                                            <h2 className="text-base font-semibold">{title}</h2>
                                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <section className="mb-10 rounded-xl border border-border bg-card p-6 shadow-card">
                                <h2 className="text-lg font-semibold tracking-tight">How it works</h2>
                                <ol className="mt-4 space-y-3">
                                    {STEPS.map((step, index) => (
                                        <li key={step} className="flex items-start gap-3 text-sm">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular">
                                                {index + 1}
                                            </span>
                                            <span className="pt-0.5 text-foreground">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </section>

                            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                                <Button asChild size="lg">
                                    <Link to="/signup">Create an account</Link>
                                </Button>
                                <Button variant="outline" size="lg" asChild>
                                    <Link to="/workspace-groups">Browse study groups</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default FindStudyPartners;
