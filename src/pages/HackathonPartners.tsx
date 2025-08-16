import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HackathonPartners = () => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Find Hackathon Partners - Project FL University Platform",
    "description": "Connect with skilled developers, designers, and business minds for hackathon teams through Project FL. Build winning teams with complementary skills at your university.",
    "url": "https://friendly-learning.lovable.app/hackathon-partners",
    "mainEntity": {
      "@type": "Service",
      "name": "Hackathon Team Formation Service",
      "provider": {
        "@type": "Organization",
        "name": "Project FL"
      },
      "serviceType": "Team Building for Competitions"
    }
  };

  return (
    <>
      <SEOHead
        title="Find Hackathon Partners & Build Winning Teams | Project FL University Platform"
        description="Connect with skilled developers, designers, and business minds for hackathon teams through Project FL. Build winning teams with complementary skills at your university. Perfect team formation for coding competitions."
        keywords="find hackathon partners, hackathon team formation, coding competition teams, university hackathon, project fl hackathon, student developer teams, hackathon teammates"
        canonical="https://friendly-learning.lovable.app/hackathon-partners"
        structuredData={structuredData}
      />
      
      <div className="min-h-screen">
        <Navbar />
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-6">Find Hackathon Partners at Your University</h1>
                <p className="text-xl text-muted-foreground">
                  Build winning hackathon teams with Project FL's skill-based matching
                </p>
              </header>

              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl mb-4">💻</div>
                  <h3 className="text-xl font-bold mb-3">Find Developers</h3>
                  <p>Connect with skilled programmers who know the languages and frameworks you need</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl mb-4">🎨</div>
                  <h3 className="text-xl font-bold mb-3">Find Designers</h3>
                  <p>Team up with UI/UX designers and graphic designers to make your project stand out</p>
                </div>
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-bold mb-3">Find Business Minds</h3>
                  <p>Partner with students skilled in business strategy, marketing, and pitch development</p>
                </div>
              </div>

              <div className="bg-muted p-8 rounded-lg mb-12">
                <h2 className="text-2xl font-bold mb-6">Popular Hackathon Skills on Project FL</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-bold mb-2">Technical Skills</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Frontend Development (React, Vue, Angular)</li>
                      <li>Backend Development (Node.js, Python, Java)</li>
                      <li>Mobile Development (React Native, Flutter)</li>
                      <li>AI/ML (TensorFlow, PyTorch)</li>
                      <li>Blockchain Development</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-2">Creative & Business Skills</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>UI/UX Design</li>
                      <li>Graphic Design</li>
                      <li>Business Strategy</li>
                      <li>Marketing & Growth</li>
                      <li>Pitch Presentation</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Ready to Build Your Dream Team?</h2>
                <p className="mb-6">Join Project FL and connect with talented students for your next hackathon</p>
                <div className="space-x-4">
                  <Button asChild size="lg">
                    <Link to="/signup">Find Hackathon Partners</Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link to="/mentors">Browse Skills</Link>
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
