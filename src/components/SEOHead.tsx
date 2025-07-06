
import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  structuredData?: object;
}

const SEOHead = ({
  title = "Friendly Learning SRM AP - Premier Student Mentorship Platform | SRMAP Academic Support",
  description = "Friendly Learning SRM AP is the leading student mentorship platform at SRM University AP. Connect with experienced peer mentors for academic guidance, career advice, and personalized learning support in Amaravati, Andhra Pradesh.",
  keywords = "friendly learning srm ap, srmap mentorship platform, srmap friendly learning, SRM AP mentorship, student mentor platform srmap, academic guidance SRM AP, university mentorship program, srm amaravati mentorship, andhra pradesh student mentoring, peer learning srmap",
  canonical,
  ogTitle,
  ogDescription,
  ogImage = "/og-image.png",
  structuredData
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let metaTag = document.querySelector(selector) as HTMLMetaElement;
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        if (property) {
          metaTag.setAttribute('property', name);
        } else {
          metaTag.setAttribute('name', name);
        }
        document.head.appendChild(metaTag);
      }
      metaTag.content = content;
    };

    // Update basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Geographic and locale targeting
    updateMetaTag('geo.region', 'IN-AP'); // Andhra Pradesh, India
    updateMetaTag('geo.placename', 'Amaravati');
    updateMetaTag('geo.position', '16.5062;80.6480'); // SRM AP coordinates
    updateMetaTag('ICBM', '16.5062, 80.6480');
    updateMetaTag('language', 'en-IN');
    updateMetaTag('country', 'India');
    
    // Additional SEO meta tags
    updateMetaTag('author', 'Friendly Learning SRM AP');
    updateMetaTag('publisher', 'SRM University AP');
    updateMetaTag('application-name', 'Friendly Learning SRM AP');
    updateMetaTag('theme-color', '#6366f1');

    // Update Open Graph tags
    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', `${window.location.origin}${ogImage}`, true);
    updateMetaTag('og:url', window.location.href, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:site_name', 'Friendly Learning SRM AP', true);
    updateMetaTag('og:locale', 'en_IN', true);
    
    // Geographic Open Graph tags
    updateMetaTag('og:locality', 'Amaravati', true);
    updateMetaTag('og:region', 'Andhra Pradesh', true);
    updateMetaTag('og:country-name', 'India', true);

    // Update Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', ogTitle || title, true);
    updateMetaTag('twitter:description', ogDescription || description, true);
    updateMetaTag('twitter:image', `${window.location.origin}${ogImage}`, true);
    updateMetaTag('twitter:site', '@FriendlyLearningSRMAP', true);

    // Update canonical URL
    if (canonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = canonical;
    }

    // Add structured data
    if (structuredData) {
      let structuredDataScript = document.querySelector('#structured-data') as HTMLScriptElement;
      if (!structuredDataScript) {
        structuredDataScript = document.createElement('script');
        structuredDataScript.id = 'structured-data';
        structuredDataScript.type = 'application/ld+json';
        document.head.appendChild(structuredDataScript);
      }
      structuredDataScript.textContent = JSON.stringify(structuredData);
    }
  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, structuredData]);

  return null;
};

export default SEOHead;
