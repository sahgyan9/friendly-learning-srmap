import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ROUTE_META } from "@/lib/seo/route-meta";
import RejectedApplicationNotice from "@/components/mentors/RejectedApplicationNotice";
import StructuredData from "@/components/StructuredData";
import { useAuth } from "@/context/AuthContext";
import { getOrganizationSchema, getWebsiteSchema } from "@/lib/structured-data";
import { PRIMARY_DOMAIN } from "@/lib/constants";
import { CampusHero } from "@/components/home/CampusHero";
import { CampusFeedWidget } from "@/components/home/CampusFeedWidget";
import { CampusSidebarWidgets } from "@/components/home/CampusSidebarWidgets";
import { RecommendedPeople } from "@/components/home/RecommendedPeople";
import { EcosystemBento } from "@/components/home/EcosystemBento";

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
    "keywords": "friendly learning srmap, fl srmap, srmap mentorship, srm ap student mentors, campusmind",
    "mainEntity": {
      "@type": "Organization",
      "name": "Friendly Learning",
      "url": `${PRIMARY_DOMAIN}/`,
      "logo": `${PRIMARY_DOMAIN}/og-image.png`,
      "sameAs": [
        "https://friendly-learning-srmap.com"
      ],
      "areaServed": {
        "@type": "Place",
        "name": "SRM University-AP"
      }
    },
    "specialty": "Campus collaboration, mentorship, and discovery",
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
        ogTitle="Friendly Learning SRMAP - Your Campus, Connected | SRM AP"
        ogDescription="Post ideas, find teammates, search with CampusMind, rate faculty, and get mentored by seniors — the all-in-one campus platform for SRM AP students."
      />

      {/* Structured data for SEO */}
      <StructuredData data={homePageSchema} />
      <StructuredData data={getOrganizationSchema()} />
      <StructuredData data={getWebsiteSchema()} />

      {/* Rejected application notice for authenticated users */}
      {user && (
        <div className="container mx-auto px-4 pt-4">
          <RejectedApplicationNotice />
        </div>
      )}

      {/* ── 1. Hero with CampusMind AI Search & Momentum Metrics ── */}
      <CampusHero />

      {/* ── 2. Main Campus Hub: 2-Column Responsive Feed & Discovery ── */}
      <main className="py-8 md:py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Live Campus Feed & Discussions (60-65% width) */}
            <section className="lg:col-span-7 xl:col-span-8 space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <h2 className="text-lg font-bold text-foreground tracking-tight">
                  Campus Feed & Discussions
                </h2>
                <span className="text-xs text-muted-foreground">Real-time student board</span>
              </div>
              <CampusFeedWidget />
            </section>

            {/* Right Column: Live Campus Sidebar Widgets (35-40% width) */}
            <aside className="lg:col-span-5 xl:col-span-4 space-y-6">
              <CampusSidebarWidgets />
            </aside>
          </div>
        </div>
      </main>

      {/* ── 3. Signed-in Personalized Recommendations (Lazy, non-blocking) ── */}
      {user && (
        <div className="border-t border-border/40 bg-muted/20 py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <RecommendedPeople />
          </div>
        </div>
      )}

      {/* ── 4. Ecosystem Bento (The 3 Core Pillars) ── */}
      <EcosystemBento />

      {/* ── 5. Call To Action ── */}
      <CallToAction />

      <Footer />
    </div>
  );
};

export default Index;
