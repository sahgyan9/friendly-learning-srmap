import Hero from "@/components/Hero";
import MentorsSection from "@/components/MentorsSection";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import FloatingChatbot from "@/components/chatbot/FloatingChatbot";
import RejectedApplicationNotice from "@/components/mentors/RejectedApplicationNotice";
import StructuredData from "@/components/StructuredData";
import { CommunityPostsSection } from "@/components/community/CommunityPostsSection";
import { FacultyDiscoveryCard } from "@/components/faculty/FacultyDiscoveryCard";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { FeaturesShowcase } from "@/components/FeaturesShowcase";
import { FutureVision } from "@/components/FutureVision";

const Index = () => {
  const { user } = useAuth();

  // Structured data for the homepage
  const homePageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `${PRIMARY_DOMAIN}/`,
    "name": "Friendly Learning SRMAP - SRM AP Student Mentorship Platform",
    "description": "Friendly Learning SRMAP connects SRM AP university students with experienced peer mentors for academic guidance, project collaboration, and study partnerships.",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Friendly Learning SRMAP",
      "url": `${PRIMARY_DOMAIN}/`
    },
    "keywords": "friendly learning srmap, fl srmap, srmap mentorship, srm ap student mentors",
    "mainEntity": {
      "@type": "EducationalOrganization",
      "name": "Friendly Learning",
      "url": `${PRIMARY_DOMAIN}/`,
      "logo": `${PRIMARY_DOMAIN}/og-image.png`,
      "sameAs": [
        "https://friendly-learning-srmap.com"
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
        title={ROUTE_META["/"].title}
        description={ROUTE_META["/"].description}
        canonical={`${PRIMARY_DOMAIN}/`}
        ogTitle="Friendly Learning SRMAP - Connect with SRM AP Student Mentors"
        ogDescription="Find academic guidance, study partners, project collaborators, and hackathon teams through the official SRM AP student mentorship platform."
      />

      {/* Add structured data for SEO */}
      <StructuredData data={homePageSchema} />
      <StructuredData data={getOrganizationSchema()} />
      <StructuredData data={getWebsiteSchema()} />

      <Hero />

      {/* Show rejected application notice for authenticated users */}
      {user && (
        <div className="container mx-auto px-4 py-4">
          <RejectedApplicationNotice />
        </div>
      )}

      {/* Faculty ratings sit directly under the hero: it is the newest feature
          and the one a first-time visitor is least likely to stumble into. */}
      <FacultyDiscoveryCard />

      <CommunityPostsSection />

      <MentorsSection />

      {/* All 8 live features with direct navigation links */}
      <FeaturesShowcase />

      {/* Roadmap: complete ecosystem + indigenous AI vision */}
      <FutureVision />

      <CallToAction />
      <Footer />
      <FloatingChatbot />
    </div>
  );
};

export default Index;
