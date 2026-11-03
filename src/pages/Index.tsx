import { useState } from "react";
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
import { PostComposerStrip } from "@/components/community-posts/PostComposerStrip";

const Index = () => {
  const { user } = useAuth();
  const [feedKey, setFeedKey] = useState(0);

  // Structured data for the homepage
  const homePageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "url": `${PRIMARY_DOMAIN}/`,
    "name": "Friendly Learning SRMAP - All-in-One Campus Platform for SRM AP Students",
    "description": "Post ideas, find teammates, search with CampusBrain, rate faculty, join groups, and get mentored by seniors — the all-in-one campus platform for SRM AP students.",
    "isPartOf": {
      "@type": "WebSite",
      "name": "Friendly Learning SRMAP",
      "url": `${PRIMARY_DOMAIN}/`
    },
    "keywords": "friendly learning srmap, fl srmap, srmap mentorship, srm ap student mentors, campusbrain",
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
        ogDescription="Post ideas, find teammates, search with CampusBrain, rate faculty, and get mentored by seniors — the all-in-one campus platform for SRM AP students."
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

      <CampusHero />

      <main className="py-10 md:py-12">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Campus feed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions, team calls and resources posted by SRM AP students.
            </p>
          </div>

          <div className="mb-6 w-full">
            <PostComposerStrip
              onPostCreated={() => setFeedKey((k) => k + 1)}
              className="max-w-none"
            />
          </div>

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
            <section className="min-w-0 space-y-4 lg:col-span-7 xl:col-span-8" aria-label="Posts">
              <CampusFeedWidget key={feedKey} />
            </section>

            <aside className="min-w-0 space-y-6 lg:col-span-5 xl:col-span-4">
              <CampusSidebarWidgets />
            </aside>
          </div>
        </div>
      </main>

      {/* Signed-in only; renders nothing until it has real matches */}
      {user && (
        <div className="border-t border-border py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <RecommendedPeople />
          </div>
        </div>
      )}

      <EcosystemBento />

      <CallToAction />

      <Footer />
    </div>
  );
};

export default Index;
