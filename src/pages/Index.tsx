import MentorsSection from "@/components/MentorsSection";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import RejectedApplicationNotice from "@/components/mentors/RejectedApplicationNotice";
import StructuredData from "@/components/StructuredData";
import { CommunityPostsSection } from "@/components/community/CommunityPostsSection";
import { FacultyDiscoveryCard } from "@/components/faculty/FacultyDiscoveryCard";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { FeaturesShowcase } from "@/components/FeaturesShowcase";
import { FutureVision } from "@/components/FutureVision";
import { AboutQuickstartStrip } from "@/components/AboutQuickstartStrip";
import { HomeIntro } from "@/components/HomeIntro";
import { CommunitiesSection } from "@/components/communities/CommunitiesSection";
import { RecommendedPeople } from "@/components/home/RecommendedPeople";

const Index = () => {
  const { user } = useAuth();

  // Structured data for the homepage
  const homePageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `${PRIMARY_DOMAIN}/`,
    "name": "Friendly Learning SRMAP - All-in-One Campus Platform for SRM AP Students",
    "description": "Post ideas, find teammates, search with CampusMind, rate faculty, join groups, and get mentored by seniors — the all-in-one campus platform for SRM AP students.",
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
    "specialty": "Campus collaboration and discovery",
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
        ogTitle="Friendly Learning SRMAP - Your Campus, One Feed | SRM AP"
        ogDescription="Post ideas, find teammates, search with CampusMind, rate faculty, and get mentored by seniors — the all-in-one campus platform for SRM AP students."
      />

      {/* Add structured data for SEO */}
      <StructuredData data={homePageSchema} />
      <StructuredData data={getOrganizationSchema()} />
      <StructuredData data={getWebsiteSchema()} />

      {/* Rejected application notice for authenticated users */}
      {user && (
        <div className="container mx-auto px-4 py-4">
          <RejectedApplicationNotice />
        </div>
      )}

      {/* 1. Posts — the page opens straight onto the feed. There is no hero
             above this any more: the composer strip and the first row of real
             cards answer "what is this site?" before a headline gets the
             chance to, and they answer it with evidence. */}
      <CommunityPostsSection />

      {/* 2. The pitch, deliberately after the evidence: the headline, the ask
             box, the two CTAs and the stats all used to sit above the feed,
             where they asked to be believed before a visitor had seen a single
             real thread. Here they confirm what was just scrolled past. */}
      <HomeIntro />

      {/* 2b. Signed-in only: people who match your interests. Hero-adjacent —
             right after the pitch confirms what the feed just showed, before
             the quickstart strip. Renders nothing for signed-out visitors and
             defers its own network call, so it never affects LCP for anyone. */}
      {user && <RecommendedPeople />}

      {/* 3. About Quickstart Strip — "what can I do right now?" */}
      <AboutQuickstartStrip />

      {/* 4. Groups — find your people */}
      <CommunitiesSection />

      {/* 5. Mentors — someone's already done your exact course */}
      <MentorsSection />

      {/* 6. Faculty Ratings — moved down from top; earns its moment here */}
      <FacultyDiscoveryCard />

      {/* 7. All 8 live features with direct navigation links */}
      <FeaturesShowcase />

      {/* 8. Roadmap: complete ecosystem + indigenous AI vision */}
      <FutureVision />

      {/* 9. CTA — your profile is someone else's answer */}
      <CallToAction />

      <Footer />
    </div>
  );
};

export default Index;

