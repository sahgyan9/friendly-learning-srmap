import { PRIMARY_DOMAIN } from "@/lib/constants";

import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

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

            <div className="min-h-screen">
                <main className="pt-24 pb-16">
                    <div className="container px-4 md:px-6">
                        <div className="max-w-4xl mx-auto">
                            <header className="text-center mb-12">
                                <h1 className="text-4xl font-bold mb-6">How Friendly Learning SRMAP Works</h1>
                                <p className="text-xl text-muted-foreground">
                                    Connect, collaborate, and succeed with fellow university students in just 3 simple steps
                                </p>
                            </header>

                            <div className="grid md:grid-cols-3 gap-8 mb-12">
                                <div className="text-center p-6 border rounded-lg">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
                                    <h3 className="text-xl font-bold mb-3">Create Your Account</h3>
                                    <p>Sign up with any email address, or continue with Google. No university email needed — it takes under a minute.</p>
                                </div>
                                <div className="text-center p-6 border rounded-lg">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
                                    <h3 className="text-xl font-bold mb-3">Complete Your Profile</h3>
                                    <p>Add your skills, courses, interests, and academic information to help others find and connect with you.</p>
                                </div>
                                <div className="text-center p-6 border rounded-lg">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
                                    <h3 className="text-xl font-bold mb-3">Connect & Collaborate</h3>
                                    <p>Find mentors, study partners, hackathon teammates, or help others with your expertise and knowledge.</p>
                                </div>
                            </div>

                            <div className="bg-muted p-8 rounded-lg mb-12">
                                <h2 className="text-2xl font-bold mb-6">What You Can Do on Friendly Learning SRMAP</h2>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="font-bold mb-2">🎓 Find Academic Help</h4>
                                        <p className="text-sm mb-4">Connect with mentors and peers for course help, assignment guidance, and exam preparation.</p>

                                        <h4 className="font-bold mb-2">💻 Build Hackathon Teams</h4>
                                        <p className="text-sm mb-4">Find developers, designers, and business minds to create winning hackathon teams.</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold mb-2">📚 Form Study Groups</h4>
                                        <p className="text-sm mb-4">Connect with classmates for collaborative learning and study sessions.</p>

                                        <h4 className="font-bold mb-2">🚀 Start Projects</h4>
                                        <p className="text-sm mb-4">Find collaborators for startup ideas, research projects, and innovative solutions.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
                                <p className="mb-6">Find the people at SRM AP who can help with what you're working on</p>
                                <div className="space-x-4">
                                    <Button asChild size="lg">
                                        <Link to="/signup">Join Friendly Learning SRMAP Now</Link>
                                    </Button>
                                    <Button variant="outline" size="lg" asChild>
                                        <Link to="/mentors">Browse Mentors</Link>
                                    </Button>
                                </div>
                                <p className="text-sm text-muted-foreground mt-6">
                                    Wondering how mentor applications and certificates are checked?{" "}
                                    <Link to="/how-verification-works" className="text-primary underline underline-offset-2">How verification works</Link>.
                                </p>
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
