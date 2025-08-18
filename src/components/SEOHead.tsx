
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
  title = "Project FL - University Student Collaboration Platform | Find Study Partners, Hackathon Teams & Project Collaborators",
  description = "Project FL connects university students for academic help, hackathon partnerships, project collaborations, startup discussions, and finding study partners. Post in community, find skilled teammates, connect with like-minded peers.",
  keywords = "project fl, university student collaboration, find hackathon partners, student project collaboration, university community posts, find study partners, startup team formation, skill-based student matching, peer learning university, student networking platform, academic help university",
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
    updateMetaTag('geo.region', 'IN'); // India
    updateMetaTag('geo.placename', 'India');
    updateMetaTag('language', 'en-IN');
    updateMetaTag('country', 'India');

    // Additional SEO meta tags
    updateMetaTag('author', 'Project FL');
    updateMetaTag('publisher', 'Project FL');
    updateMetaTag('application-name', 'Project FL');
    updateMetaTag('theme-color', '#6366f1');

    // Update Open Graph tags
    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', `${window.location.origin}${ogImage}`, true);
    updateMetaTag('og:url', window.location.href, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:site_name', 'Project FL', true);
    updateMetaTag('og:locale', 'en_IN', true);
    updateMetaTag('og:country-name', 'India', true);

    // Update Twitter tags
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', ogTitle || title, true);
    updateMetaTag('twitter:description', ogDescription || description, true);
    updateMetaTag('twitter:image', `${window.location.origin}${ogImage}`, true);
    updateMetaTag('twitter:site', '@ProjectFL', true);

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
    // If no canonical provided, ensure canonical points to primary domain
    if (!canonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      const desiredHost = 'www.project-fl.me';
      const url = new URL(window.location.href);
      url.hostname = desiredHost;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = url.toString();
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
