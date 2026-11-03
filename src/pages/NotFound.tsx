import { PRIMARY_DOMAIN } from "@/lib/constants";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import NoIndex from "@/components/NoIndex";
import StructuredData from "@/components/StructuredData";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { OPEN_SEARCH_EVENT } from "@/lib/search/events";

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
      document.title = '404 - Page Not Found | Friendly Learning SRMAP';
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
        title="404 - Page Not Found | Friendly Learning SRMAP"
        description="The page you're looking for could not be found."
        canonical={`${PRIMARY_DOMAIN}${location.pathname}`}
      />
      <StructuredData data={structuredData} />
      <NoIndex />

      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-md text-center animate-fade-up">
            <p className="tabular text-sm font-semibold text-primary">404</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Page not found</h1>
            <p className="mt-4 text-muted-foreground">
              Nothing lives at <code className="break-all rounded bg-secondary px-1.5 py-0.5 text-sm text-secondary-foreground">{location.pathname}</code>.
              The link may be old, or the page may have moved.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/">Go to the homepage</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))}
              >
                <Search aria-hidden />
                Search the site
              </Button>
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Followed a broken link here?{" "}
              <Link to="/contact" className="text-primary underline underline-offset-2">Tell us</Link>.
            </p>
          </div>
        </main>
      </div>
    </>
  );
};

export default NotFound;
