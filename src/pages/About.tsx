
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
        title="About Friendly Learning - SRM AP Student Mentorship Platform | Our Mission & Story"
        description="Learn about Friendly Learning's mission to connect SRM AP students with peer mentors. Discover our story, values, and commitment to collaborative learning and academic success."
        keywords="about Friendly Learning, SRM AP mentorship platform, student mentorship mission, peer learning story, university mentorship values"
        canonical="https://friendly-learning.lovable.app/about"
        structuredData={structuredData}
      />
      
      <div className="min-h-screen">
        <Navbar />
        
        <main className="pt-24 pb-16">
          <div className="container px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <header>
                <h1 className="text-4xl font-bold mb-6">About Friendly Learning</h1>
              </header>
              
              <section className="mb-8">
                <p className="text-lg mb-6">
                  Friendly Learning is a peer-to-peer mentorship platform designed to connect SRM AP students 
                  with experienced mentors who can help them excel in their academic journey.
                </p>
                
                <p className="text-lg mb-6">
                  Our mission is to create a collaborative learning environment where knowledge is 
                  shared freely, and everyone has access to the support they need to succeed.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Our Story</h2>
                <p className="mb-6">
                  Friendly Learning was founded by a group of SRM AP students who recognized the value of 
                  peer mentorship in their own academic success. They created this platform to 
                  formalize and expand the reach of student-to-student mentoring at our university.
                </p>
              </section>
              
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Why Choose Friendly Learning?</h2>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>Connect with verified student mentors from your own university</li>
                  <li>Get personalized academic guidance from peers who understand your challenges</li>
                  <li>Access mentors across various departments and specializations</li>
                  <li>Flexible mentorship options that fit your schedule</li>
                  <li>Safe and secure platform with verified mentor profiles</li>
                </ul>
              </section>
              
              <section className="mb-12">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Join Our Community</h2>
                <p className="mb-6">
                  Whether you're looking for help or want to share your knowledge, 
                  Friendly Learning has a place for you in the SRM AP academic community.
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
