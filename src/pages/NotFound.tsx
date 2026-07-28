import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Set the HTTP status code meta tag for search engines
    let metaTag = document.querySelector('meta[name="http-status"]') as HTMLMetaElement;
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'http-status');
      document.head.appendChild(metaTag);
    }
    metaTag.content = '404';

    // If we're in a browser context that supports it
    if (typeof window !== 'undefined' && 'Response' in window) {
      document.title = '404 - Page Not Found | Project FL';
    }
  }, [location.pathname]);

  // Structured data for error page
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Page Not Found",
    "description": "The requested page could not be found.",
    "url": window.location.href,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": `${PRIMARY_DOMAIN}/`
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Error",
          "item": window.location.href
        }
      ]
    }
  };

  return (
    <>
      <SEOHead
        title="404 - Page Not Found | Project FL"
        description="The page you're looking for could not be found."
        canonical={`${PRIMARY_DOMAIN}${location.pathname}`}
      />
      <StructuredData data={structuredData} />

      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center py-12">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
                <FileSearch className="h-8 w-8 text-blue-600" />
              </div>

              <h1 className="text-3xl font-bold mb-3">404: Page Not Found</h1>

              <p className="text-muted-foreground mb-6">
                The page you're looking for doesn't exist or has been moved.
              </p>

              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/">Return Home</Link>
                </Button>

                <Button variant="outline" asChild className="w-full">
                  <Link to="/contact">Contact Support</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFound;
