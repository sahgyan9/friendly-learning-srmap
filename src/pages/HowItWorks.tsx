
import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorks = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": "How Project FL Works - Student Collaboration Platform",
        "description": "Learn how Project FL connects university students for mentoring, study partnerships, hackathon teams, and academic collaboration",
        "url": "https://www.project-fl.me/how-it-works",
        "step": [
            {
                "@type": "HowToStep",
                "name": "Sign Up with University Email",
                "text": "Create your account using your verified university email address to join the Project FL community."
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
                title="How Project FL Works | University Student Collaboration Guide"
                description="Learn how Project FL connects university students worldwide for mentoring, study partnerships, hackathon teams, and academic collaboration. Simple 3-step process to start collaborating."
                keywords="how project fl works, university student collaboration guide, student mentoring platform, academic help process, project fl tutorial"
                canonical="https://www.project-fl.me/how-it-works"
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
                                    Connect, collaborate, and succeed with fellow university students in just 3 simple steps
                                </p>
                            </header>

                            <div className="grid md:grid-cols-3 gap-8 mb-12">
                                <div className="text-center p-6 border rounded-lg">
                                    <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
                                    <h3 className="text-xl font-bold mb-3">Sign Up with University Email</h3>
                                    <p>Create your account using your verified university email address to join our trusted student community.</p>
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
                                <h2 className="text-2xl font-bold mb-6">What You Can Do on Project FL</h2>
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
                                <p className="mb-6">Join thousands of university students already collaborating on Project FL</p>
                                <div className="space-x-4">
                                    <Button asChild size="lg">
                                        <Link to="/signup">Join Project FL Now</Link>
                                    </Button>
                                    <Button variant="outline" size="lg" asChild>
                                        <Link to="/mentors">Browse Mentors</Link>
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

export default HowItWorks;
