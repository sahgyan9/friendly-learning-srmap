import { PRIMARY_DOMAIN } from "@/lib/constants";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Target, BookOpen, Users, Clock } from "lucide-react";

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

            <div className="min-h-screen">
                <main className="pt-24 pb-16">
                    <div className="container px-4 md:px-6">
                        <div className="max-w-4xl mx-auto">
                            <header className="text-center mb-12">
                                <h1 className="text-4xl font-bold mb-6">Find Study Partners at Your University</h1>
                                <p className="text-xl text-muted-foreground">
                                    Connect with fellow students for better academic success through Friendly Learning SRMAP
                                </p>
                            </header>

                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <div className="p-6 border rounded-lg bg-card">
                                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2.5">
                                        <Target className="h-5 w-5 text-primary shrink-0" />
                                        <span>Course-Specific Partners</span>
                                    </h3>
                                    <p className="text-muted-foreground">Find students taking the same courses as you for targeted study sessions and assignment collaboration.</p>
                                </div>
                                <div className="p-6 border rounded-lg bg-card">
                                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2.5">
                                        <BookOpen className="h-5 w-5 text-primary shrink-0" />
                                        <span>Study Group Formation</span>
                                    </h3>
                                    <p className="text-muted-foreground">Create or join study groups with students who share your learning goals and schedule preferences.</p>
                                </div>
                                <div className="p-6 border rounded-lg bg-card">
                                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2.5">
                                        <Users className="h-5 w-5 text-primary shrink-0" />
                                        <span>Skill Exchange</span>
                                    </h3>
                                    <p className="text-muted-foreground">Help others in subjects you excel at while getting support in areas where you need improvement.</p>
                                </div>
                                <div className="p-6 border rounded-lg bg-card">
                                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2.5">
                                        <Clock className="h-5 w-5 text-primary shrink-0" />
                                        <span>Flexible Scheduling</span>
                                    </h3>
                                    <p className="text-muted-foreground">Connect with students who match your availability for study sessions and group meetings.</p>
                                </div>
                            </div>

                            <div className="bg-muted p-8 rounded-lg mb-12">
                                <h2 className="text-2xl font-bold mb-4">How to Find Study Partners on Friendly Learning SRMAP</h2>
                                <ol className="list-decimal list-inside space-y-3">
                                    <li>Sign up with any email, or continue with Google</li>
                                    <li>Add your courses, subjects, and study preferences</li>
                                    <li>Search for students by course, major, or study topics</li>
                                    <li>Connect and arrange study sessions or join groups</li>
                                    <li>Post on the board if you need specific help</li>
                                </ol>
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">Start Finding Study Partners Today</h2>
                                <p className="mb-6">Find someone at SRM AP taking the same course as you</p>
                                <div className="space-x-4">
                                    <Button asChild size="lg">
                                        <Link to="/signup">Find Study Partners Now</Link>
                                    </Button>
                                    <Button variant="outline" size="lg" asChild>
                                        <Link to="/workspace-groups">Browse Workspace Groups</Link>
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

export default FindStudyPartners;
