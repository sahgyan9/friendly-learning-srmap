
import Hero from "@/components/Hero";
import MentorsSection from "@/components/MentorsSection";
import WhyFriendlyLearning from "@/components/WhyFriendlyLearning";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import FloatingChatbot from "@/components/chatbot/FloatingChatbot";
import RejectedApplicationNotice from "@/components/mentors/RejectedApplicationNotice";
import StructuredData from "@/components/StructuredData";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/structured-data";

const Index = () => {
  const { user } = useAuth();

  // Structured data for the homepage
  const homePageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": "https://www.project-fl.me/",
    "name": "Project FL - University Student Collaboration Platform",
    "description": "Find and connect with verified student mentors for academic guidance, career advice, and peer support. Join our community of learners helping learners.",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Project FL",
      "url": "https://www.project-fl.me/"
    },
    "mainEntity": {
      "@type": "Organization",
      "name": "Project FL",
      "url": "https://www.project-fl.me/",
      "logo": "https://www.project-fl.me/og-image.png"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Project FL - University Student Collaboration Platform | Find Study Partners, Hackathon Teams & Project Collaborators"
        description="Find and connect with verified student mentors for academic guidance, career advice, and peer support. Join our community of learners helping learners."
        canonical="https://www.project-fl.me/"
        ogTitle="Project FL - Connect with University Students & Mentors"
        ogDescription="Find study partners, mentors, project collaborators, and hackathon teams through our university student collaboration platform."
      />

      {/* Add structured data for SEO */}
      <StructuredData data={homePageSchema} />
      <StructuredData data={getOrganizationSchema()} />
      <StructuredData data={getWebsiteSchema()} />

      <Navbar />
      <Hero />

      {/* Show rejected application notice for authenticated users */}
      {user && (
        <div className="container mx-auto px-4 py-4">
          <RejectedApplicationNotice />
        </div>
      )}

      <MentorsSection />
      <WhyFriendlyLearning />
      <CallToAction />
      <Footer />
      <FloatingChatbot />
    </div>
  );
};

export default Index;
