
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
    "url": "https://friendly-learning-srmap.lovable.app/",
    "name": "Friendly Learning SRMAP - SRM AP Student Mentorship Platform",
    "description": "Friendly Learning SRMAP connects SRM AP university students with experienced peer mentors for academic guidance, project collaboration, and study partnerships.",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Friendly Learning SRMAP",
      "url": "https://friendly-learning-srmap.lovable.app/"
    },
    "keywords": "friendly learning srmap, fl srmap, srmap mentorship, srm ap student mentors",
    "mainEntity": {
      "@type": "EducationalOrganization",
      "name": "Friendly Learning",
      "url": "https://friendly-learning-srmap.lovable.app/",
      "logo": "https://friendly-learning-srmap.lovable.app/og-image.png",
      "sameAs": [
        "https://www.project-fl.me"
      ],
      "educationalCredentialAwarded": "Peer Mentorship",
      "serviceArea": {
        "@type": "Place",
        "name": "SRM University AP"
      }
    },
    "specialty": "Student academic mentorship",
    "audience": {
      "@type": "Audience",
      "audienceType": "University students"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Friendly Learning SRMAP - Student Mentorship Platform | SRM AP Academic Mentors"
        description="Friendly Learning SRMAP connects SRM AP university students with experienced peer mentors for academic guidance, project collaboration, and study partnerships. Get personalized help from verified mentors in your department."
        canonical="https://friendly-learning-srmap.lovable.app/"
        ogTitle="Friendly Learning SRMAP - Connect with SRM AP Student Mentors"
        ogDescription="Find academic guidance, study partners, project collaborators, and hackathon teams through the official SRM AP student mentorship platform."
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
