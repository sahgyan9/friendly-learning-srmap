import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Code, Palette, BarChart3 } from "lucide-react";

const HackathonPartners = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Find Hackathon Partners - Friendly Learning SRMAP University Platform",
        "description": "Connect with skilled developers, designers, and business minds for hackathon teams through Friendly Learning SRMAP. Build winning teams with complementary skills at your university.",
        "url": `${PRIMARY_DOMAIN}/hackathon-partners`,
        "mainEntity": {
            "@type": "Service",
            "name": "Hackathon Team Formation Service",
            "provider": {
                "@type": "Organization",
                "name": "Friendly Learning SRMAP"
            },
            "serviceType": "Team Building for Competitions"
        }
    };

    return (
        <>
            <SEOHead
                title={ROUTE_META["/hackathon-partners"].title}
                description={ROUTE_META["/hackathon-partners"].description}
                keywords="find hackathon partners, hackathon team formation, coding competition teams, university hackathon, Friendly Learning SRMAP hackathon, student developer teams, hackathon teammates"
                canonical={`${PRIMARY_DOMAIN}/hackathon-partners`}
                structuredData={structuredData}
            />

            <div className="min-h-screen">
                <main className="pt-8 pb-16 md:pt-10">
                    <div className="container px-4 md:px-6">
                        <div className="max-w-4xl mx-auto">
                            <header className="mb-10">
                                <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">Find hackathon partners at SRM AP</h1>
                                <p className="text-lg text-muted-foreground">
                                    Find developers, designers and business students to enter a hackathon with.
                                </p>
                            </header>

                            <div className="grid md:grid-cols-3 gap-6 mb-10">
                                <div className="p-6 border rounded-lg bg-card shadow-card">
                                    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-foreground mb-4">
                                        <Code className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2">Find Developers</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Connect with skilled programmers who know the languages and frameworks you need</p>
                                </div>
                                <div className="p-6 border rounded-lg bg-card shadow-card">
                                    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-foreground mb-4">
                                        <Palette className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2">Find Designers</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Team up with UI/UX designers and graphic designers to make your project stand out</p>
                                </div>
                                <div className="p-6 border rounded-lg bg-card shadow-card">
                                    <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center text-foreground mb-4">
                                        <BarChart3 className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-base font-semibold mb-2">Find Business Minds</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Partner with students skilled in business strategy, marketing, and pitch development</p>
                                </div>
                            </div>

                            <div className="border p-6 md:p-8 rounded-lg mb-10">
                                <h2 className="text-xl font-semibold tracking-tight mb-5">Skills students list most often</h2>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <h3 className="font-medium mb-2">Technical</h3>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            <li>Frontend Development (React, Vue, Angular)</li>
                                            <li>Backend Development (Node.js, Python, Java)</li>
                                            <li>Mobile Development (React Native, Flutter)</li>
                                            <li>AI/ML (TensorFlow, PyTorch)</li>
                                            <li>Blockchain Development</li>
                                        </ul>
                                    </div>
                                    <div>
                                        <h3 className="font-medium mb-2">Creative and business</h3>
                                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                            <li>UI/UX Design</li>
                                            <li>Graphic Design</li>
                                            <li>Business Strategy</li>
                                            <li>Marketing & Growth</li>
                                            <li>Pitch Presentation</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                <h2 className="text-xl font-semibold tracking-tight">Start a team</h2>
                                <p className="text-sm text-muted-foreground">Browse open hackathons and see who else wants to enter. No account needed to look.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {/* Was /signup, which asked people to make an account before
                                        showing them anything. /opportunities is the thing this page
                                        has always advertised, and it is now real — teams, skills
                                        wanted, and a group chat. Browsing needs no account. */}
                                    <Button asChild>
                                        <Link to="/opportunities">Browse hackathons</Link>
                                    </Button>
                                    <Button variant="outline" asChild>
                                        <Link to="/mentors">Browse students by skill</Link>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </>
    );
};

export default HackathonPartners;
