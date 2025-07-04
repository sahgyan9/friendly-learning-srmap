
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
    "name": "About Friendly Learning",
    "description": "Learn about Friendly Learning, the premier peer-to-peer mentorship platform for SRM AP students",
    "mainEntity": {
      "@type": "Organization",
      "name": "Friendly Learning",
      "description": "A peer-to-peer mentorship platform designed to connect SRM AP students with experienced mentors",
      "foundingDate": "2024",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Amaravati",
        "addressRegion": "Andhra Pradesh",
        "addressCountry": "IN"
      },
      "serviceArea": "SRM University AP",
      "mission": "To create a collaborative learning environment where knowledge is shared freely, and everyone has access to the support they need to succeed"
    }
  };

  return (
    <>
      <SEOHead
        title="About Friendly Learning SRM AP - Premier Student Mentorship Platform | Our Mission & Story"
        description="Learn about Friendly Learning SRM AP's mission to connect students with peer mentors at SRM University AP, Amaravati. Discover our story, values, and commitment to collaborative learning and academic success in Andhra Pradesh."
        keywords="about friendly learning srm ap, srmap mentorship platform, srmap friendly learning, SRM AP mentorship platform, student mentorship mission amaravati, peer learning story andhra pradesh, university mentorship values srmap"
        canonical="https://friendly-learning.lovable.app/about"
        structuredData={structuredData}
      />
      
      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <header>
                <h1 className="text-4xl font-bold mb-6">About <strong>Friendly Learning SRM AP</strong></h1>
              </header>
              
              <section className="mb-8">
                <p className="text-lg mb-6">
                  <strong>Friendly Learning SRM AP</strong> is a <strong>peer-to-peer mentorship platform</strong> designed to connect <strong>SRM AP students</strong> 
                  with experienced <strong>academic mentors</strong> who can help them excel in their <strong>university journey</strong>.
                </p>
                
                <p className="text-lg mb-6">
                  Our mission is to create a <strong>collaborative learning environment</strong> where <strong>academic knowledge</strong> is 
                  shared freely, and every <strong>SRMAP student</strong> has access to the <strong>mentorship support</strong> they need to succeed.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Our <strong>Mentorship Story</strong></h2>
                <p className="mb-6">
                  <strong>Friendly Learning SRMAP</strong> was founded by a group of <strong>SRM AP students</strong> who recognized the value of 
                  <strong>peer mentorship</strong> in their own <strong>academic success</strong>. They created this <strong>student platform</strong> to 
                  formalize and expand the reach of <strong>student-to-student mentoring</strong> at our <strong>university in Amaravati</strong>.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Why Choose <strong>Friendly Learning SRM AP</strong>?</h2>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>Connect with <strong>verified student mentors</strong> from <strong>SRM University AP</strong></li>
                  <li>Get <strong>personalized academic guidance</strong> from <strong>peer mentors</strong> who understand your challenges</li>
                  <li>Access <strong>mentors across departments</strong> and <strong>academic specializations</strong></li>
                  <li><strong>Flexible mentorship options</strong> that fit your <strong>university schedule</strong></li>
                  <li><strong>Safe and secure</strong> platform with <strong>verified mentor profiles</strong></li>
                </ul>
                
                <h3 className="text-xl font-semibold mt-8 mb-4"><strong>Academic Support</strong> Areas</h3>
                <p className="mb-4">
                  Our <strong>SRMAP mentorship platform</strong> covers all major <strong>academic disciplines</strong> including:
                </p>
                <ul className="list-disc pl-6 mb-6 space-y-1">
                  <li><strong>Engineering mentorship</strong> - All branches</li>
                  <li><strong>Business studies support</strong> - Management and commerce</li>
                  <li><strong>Computer science guidance</strong> - Programming and tech</li>
                  <li><strong>Research methodology</strong> - Project guidance</li>
                  <li><strong>Career counseling</strong> - Professional development</li>
                </ul>
              </section>
              
              <section className="mb-12">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Join Our <strong>Student Community</strong></h2>
                <p className="mb-6">
                  Whether you're looking for <strong>academic help</strong> or want to share your <strong>knowledge as mentor</strong>, 
                  <strong>Friendly Learning SRM AP</strong> has a place for you in the <strong>SRM AP academic community</strong>.
                </p>
                
                <div className="mt-8 mb-12">
                  <Button asChild size="lg">
                    <Link to="/signup">Get Started Today</Link>
                  </Button>
                </div>
              </section>
            </div>
            
            <section className="mt-16">
              <TeamMembers />
            </section>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default About;
