import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import TeamMembers from "@/components/about/TeamMembers";

const About = () => {
    const structuredData = {
        "@context": "https://schema.org",
        "@type": "AboutPage",
        "name": "About Project FL",
        "description": "Learn about Project FL, the premier friendly learning platform connecting students with experienced mentors",
        "mainEntity": {
            "@type": "Organization",
            "name": "Project FL",
            "description": "A friendly learning platform designed to connect students with experienced mentors for personalized guidance and career support",
            "foundingDate": "2024",
            "serviceArea": "Global",
            "mission": "To create a collaborative learning environment where knowledge is shared freely, and everyone has access to the support they need to succeed"
        }
    };

    return (
        <>
            <SEOHead
                title="About Project FL - Friendly Learning Platform | Our Mission & Story"
                description="Learn about Project FL's mission to connect students with experienced mentors. Discover our story, values, and commitment to collaborative learning and academic success through personalized mentorship."
                keywords="about project fl, friendly learning platform, project fl mentorship, student mentorship mission, peer learning story, friendly learning values, mentorship platform"
                canonical="https://friendly-learning-srmap.lovable.app/about"
                structuredData={structuredData}
            />

            <div className="min-h-screen">
                <Navbar />
                <main className="pt-24 pb-16">
                    <div className="container px-4 md:px-6">
                        <div className="max-w-3xl mx-auto">
                            <header>
                                <h1 className="text-4xl font-bold mb-6">About Project FL</h1>
                            </header>
                            <section className="mb-8">
                                <p className="text-lg mb-6">
                                    <strong>Project FL (Friendly Learning)</strong> is more than just a platform — it's a movement to empower students through personalized mentorship. Our friendly learning ecosystem is designed to bridge the academic and career gap by connecting students with experienced mentors who provide guidance, support, and expertise. Whether you're stuck on coursework, exploring new skills, preparing for competitions, or looking for career guidance — the help you need is available through our innovative platform.
                                </p>
                                <p className="text-lg mb-6">
                                    Our approach is simple: we believe that learning is most effective when it's collaborative, supportive, and personalized. Through Project FL, we create meaningful connections between students seeking knowledge and mentors ready to share their expertise.
                                </p>
                                <p className="text-lg mb-6">
                                    <strong>FL stands for Friendly Learning</strong> — emphasizing our commitment to creating a welcoming, supportive environment where everyone feels comfortable asking questions, sharing knowledge, and growing together.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                                <p className="text-lg mb-6">
                                    To create a collaborative learning environment where knowledge is shared freely, and everyone has access to the personalized support they need to succeed in their academic and professional journey.
                                </p>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="text-center p-4">
                                        <div className="text-4xl mb-4">🔍</div>
                                        <h3 className="text-xl font-bold mb-2">Find a Mentor</h3>
                                        <p>Browse through our community of experienced mentors and find the perfect match for your learning needs.</p>
                                    </div>
                                    <div className="text-center p-4">
                                        <div className="text-4xl mb-4">💬</div>
                                        <h3 className="text-xl font-bold mb-2">Connect & Learn</h3>
                                        <p>Engage in meaningful conversations, get personalized guidance, and accelerate your learning journey.</p>
                                    </div>
                                    <div className="text-center p-4">
                                        <div className="text-4xl mb-4">🚀</div>
                                        <h3 className="text-xl font-bold mb-2">Achieve Your Goals</h3>
                                        <p>With the right support and guidance, reach your academic and career milestones faster than ever.</p>
                                    </div>
                                </div>
                            </section>

                            <section className="mb-8">
                                <h2 className="text-2xl font-bold mb-4">Why Choose Project FL?</h2>
                                <div className="space-y-4">
                                    <div className="flex items-start space-x-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <div>
                                            <h3 className="font-bold">Personalized Matching</h3>
                                            <p>Our platform connects you with mentors who match your specific learning goals and interests.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <div>
                                            <h3 className="font-bold">Flexible Learning</h3>
                                            <p>Learn at your own pace with mentors who understand your schedule and constraints.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <div>
                                            <h3 className="font-bold">Supportive Community</h3>
                                            <p>Join a community of learners and mentors who are committed to mutual growth and success.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-primary text-xl">✓</span>
                                        <div>
                                            <h3 className="font-bold">Proven Results</h3>
                                            <p>Our mentorship approach has helped countless students achieve their academic and career goals.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="text-center mb-8">
                                <h2 className="text-3xl font-bold mb-4">Ready to Start Your Journey?</h2>
                                <p className="text-lg mb-6">
                                    Join Project FL today and connect with mentors who can help you unlock your full potential.
                                </p>
                                <div className="space-x-4">
                                    <Button asChild size="lg">
                                        <Link to="/signup">Get Started Today</Link>
                                    </Button>
                                    <Button variant="outline" size="lg" asChild>
                                        <Link to="/mentors">Explore Mentors</Link>
                                    </Button>
                                </div>
                            </section>
                        </div>
                    </div>
                </main>
                <TeamMembers />
                <Footer />
            </div>
        </>
    );
};

export default About;
