
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
  title = "Friendly Learning - SRM AP Student Mentorship Platform",
  description = "Connect with experienced student mentors at SRM AP University. Get academic guidance, career advice, and peer support from verified mentors in your field of study.",
  keywords = "SRM AP mentorship, student mentor platform, academic guidance SRM, university mentorship program",
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

    // Update Open Graph tags
    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', `${window.location.origin}${ogImage}`, true);
    updateMetaTag('og:url', window.location.href, true);

    // Update Twitter tags
    updateMetaTag('twitter:title', ogTitle || title, true);
    updateMetaTag('twitter:description', ogDescription || description, true);
    updateMetaTag('twitter:image', `${window.location.origin}${ogImage}`, true);

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
