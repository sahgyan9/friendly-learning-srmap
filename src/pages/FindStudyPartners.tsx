import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FindStudyPartners = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "Find Study Partners at University - Project FL",
        "description": "Connect with study partners at your university through Project FL. Find students in your courses, form study groups, and improve your academic performance together.",
        "url": "https://www.project-fl.me/find-study-partners",
        "mainEntity": {
            "@type": "Service",
            "name": "University Study Partner Matching",
            "provider": {
                "@type": "Organization",
                "name": "Project FL"
            },
            "serviceType": "Educational Networking",
            "areaServed": "Universities Worldwide"
        }
    };

    return (
        <>
            <SEOHead
                title="Find Study Partners at Your University | Project FL Student Collaboration Platform"
                description="Connect with study partners at your university through Project FL. Find students in your courses, form study groups, and improve academic performance together. University student networking made easy."
                keywords="find study partners university, university study groups, student collaboration, academic study partners, college study buddies, project fl study partners, university networking"
                canonical="https://www.project-fl.me/find-study-partners"
                structuredData={structuredData}
            />

            <div className="min-h-screen">
                <Navbar />
                <main className="pt-24 pb-16">
                    <div className="container px-4 md:px-6">
                        <div className="max-w-4xl mx-auto">
                            <header className="text-center mb-12">
                                <h1 className="text-4xl font-bold mb-6">Find Study Partners at Your University</h1>
                                <p className="text-xl text-muted-foreground">
                                    Connect with fellow students for better academic success through Project FL
                                </p>
                            </header>

                            <div className="grid md:grid-cols-2 gap-8 mb-12">
                                <div className="p-6 border rounded-lg">
                                    <h3 className="text-xl font-bold mb-3">🎯 Course-Specific Partners</h3>
                                    <p>Find students taking the same courses as you for targeted study sessions and assignment collaboration.</p>
                                </div>
                                <div className="p-6 border rounded-lg">
                                    <h3 className="text-xl font-bold mb-3">📚 Study Group Formation</h3>
                                    <p>Create or join study groups with students who share your learning goals and schedule preferences.</p>
                                </div>
                                <div className="p-6 border rounded-lg">
                                    <h3 className="text-xl font-bold mb-3">🤝 Skill Exchange</h3>
                                    <p>Help others in subjects you excel at while getting support in areas where you need improvement.</p>
                                </div>
                                <div className="p-6 border rounded-lg">
                                    <h3 className="text-xl font-bold mb-3">⏰ Flexible Scheduling</h3>
                                    <p>Connect with students who match your availability for study sessions and group meetings.</p>
                                </div>
                            </div>

                            <div className="bg-muted p-8 rounded-lg mb-12">
                                <h2 className="text-2xl font-bold mb-4">How to Find Study Partners on Project FL</h2>
                                <ol className="list-decimal list-inside space-y-3">
                                    <li>Sign up with your university email address</li>
                                    <li>Add your courses, subjects, and study preferences</li>
                                    <li>Search for students by course, major, or study topics</li>
                                    <li>Connect and arrange study sessions or join groups</li>
                                    <li>Post in community if you need specific help</li>
                                </ol>
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">Start Finding Study Partners Today</h2>
                                <p className="mb-6">Join thousands of university students already collaborating on Project FL</p>
                                <div className="space-x-4">
                                    <Button asChild size="lg">
                                        <Link to="/signup">Find Study Partners Now</Link>
                                    </Button>
                                    <Button variant="outline" size="lg" asChild>
                                        <Link to="/community-posts">Browse Study Groups</Link>
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
