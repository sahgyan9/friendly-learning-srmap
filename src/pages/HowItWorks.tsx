import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorks = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How to Use Project FL for University Student Collaboration",
        "description": "Step-by-step guide on using Project FL to find study partners, hackathon teams, and project collaborators at your university",
        "image": "https://www.project-fl.me/og-image.png",
        "totalTime": "PT10M",
        "supply": ["University email address", "Internet connection"],
        "tool": ["Project FL platform", "Web browser"],
        "step": [
            {
                "@type": "HowToStep",
                "name": "Sign Up",
                "text": "Create your Project FL account using your university email",
                "image": "https://www.project-fl.me/og-image.png"
            },
            {
                "@type": "HowToStep",
                "name": "Complete Profile",
                "text": "Add your skills, interests, and what you're looking for (study partners, hackathon teams, project collaborators)",
                "image": "https://www.project-fl.me/og-image.png"
            },
            {
                "@type": "HowToStep",
                "name": "Search and Connect",
                "text": "Use our search filters to find students with the skills or interests you need, or post in the community",
                "image": "https://www.project-fl.me/og-image.png"
            }
        ]
    };

    return (
        <>
            <SEOHead
                title="How Project FL Works - University Student Collaboration Platform Guide"
                description="Learn how to use Project FL to find study partners, hackathon teams, and project collaborators at your university. Step-by-step guide for university student networking."
                keywords="how project fl works, university student collaboration guide, find study partners guide, hackathon team formation, student networking tutorial"
                structuredData={structuredData}
            />

            <div className="min-h-screen">
                <Navbar />
                <main className="pt-24 pb-16">
                    <div className="container px-4 md:px-6">
                        <div className="max-w-4xl mx-auto">
                            <header className="text-center mb-12">
                                <h1 className="text-4xl font-bold mb-6">How Project FL Works</h1>
                                <p className="text-xl text-muted-foreground">
                                    Your step-by-step guide to university student collaboration success
                                </p>
                            </header>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                                <div className="text-center p-6 border rounded-lg">
                                    <div className="text-5xl mb-4">1️⃣</div>
                                    <h3 className="text-xl font-bold mb-3">Sign Up</h3>
                                    <p>Create your account using your university email to join your campus community</p>
                                </div>
                                <div className="text-center p-6 border rounded-lg">
                                    <div className="text-5xl mb-4">2️⃣</div>
                                    <h3 className="text-xl font-bold mb-3">Build Profile</h3>
                                    <p>Add your skills, courses, interests, and what you're seeking help with or can offer</p>
                                </div>
                                <div className="text-center p-6 border rounded-lg">
                                    <div className="text-5xl mb-4">3️⃣</div>
                                    <h3 className="text-xl font-bold mb-3">Connect & Collaborate</h3>
                                    <p>Search for students, post in community, and start collaborating on projects or studies</p>
                                </div>
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">Ready to Start Collaborating?</h2>
                                <Button asChild size="lg">
                                    <Link to="/signup">Join Your University Network</Link>
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

export default HowItWorks;
