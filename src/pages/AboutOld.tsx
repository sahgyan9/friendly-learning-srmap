
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
        canonical="https://friendly-learning-srmap.lovable.app/about"
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
                  <strong>Friendly Learning</strong> is more than just a platform — it's a movement to empower students through students. Born at SRM University, Andhra Pradesh, Friendly Learning is a peer-to-peer mentorship and collaboration network designed to bridge the academic gap between students and their peers. Whether you're stuck on an assignment, exploring a new skill, preparing for a hackathon, or looking for like-minded project partners — the help you need is often just a few doors away. We’re here to help you find it.
                </p>
              </section>
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Our Story</h2>
                <p className="mb-6">
                  The journey began when a group of students, like many others, faced confusion about assignments, subject expectations, and navigating university life. YouTube didn’t always help, professors weren’t always available, and Google didn’t always have the answers. The real solution? Students who had been there, done that.
                </p>
                <p className="mb-6">
                  So we built Friendly Learning — a platform where any student can search for help and connect directly with a verified student mentor from their own university, someone who’s already solved the exact problem they’re facing.
                </p>
                <p className="mb-6">
                  What started as a simple idea became a seven-month-long mission to build a functional, scalable, AI-powered, student-first mentorship ecosystem.
                </p>
              </section>
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Our Vision</h2>
                <p className="mb-6">
                  To create a globally recognized, student-first learning ecosystem that redefines how mentorship, collaboration, and academic help is accessed — not from the internet, but from your own campus community.
                </p>
              </section>
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Our Mission</h2>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>✅ To connect students to the right mentors within their university</li>
                  <li>✅ To make mentorship accessible, informal, and empowering</li>
                  <li>✅ To recognize and reward student mentors for their contribution</li>
                  <li>✅ To build a collaborative culture of growth, innovation, and learning in every university</li>
                </ul>
              </section>
              <section className="mb-8">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Why Friendly Learning?</h2>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                  <li>🔒 Verified Mentors Only — All mentors are real, active students with proven skills</li>
                  <li>🧠 AI-Powered Search — Just type your problem, and we’ll match you with the right mentor</li>
                  <li>🌱 Cross-Department Learning — Get help across physics, CS, business, humanities & more</li>
                  <li>💬 One-on-One Messaging — Connect freely, meet up, and learn without formality</li>
                  <li>🌍 A Social Learning Network — Join community posts, find project partners, research groups, and collaborators</li>
                  <li>🏅 Build Your Mentor Profile — Gain recognition through badges, reviews, and student impact</li>
                </ul>
                <blockquote className="italic border-l-4 border-blue-400 pl-4 my-4">
                  "Friendly Learning is not just an app — it’s a gateway to unlock the hidden potential inside your university."
                </blockquote>
                <p className="mb-6">
                  Whether you're here to grow, guide, learn, or lead — Friendly Learning welcomes you.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-2xl font-semibold mt-10 mb-4">Join Our Community</h2>
                <p className="mb-6">
                  Whether you're looking for help or want to share your knowledge, Friendly Learning has a place for you in the SRM AP academic community.
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
