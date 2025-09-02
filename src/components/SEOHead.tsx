
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
  title = "Friendly Learning SRMAP - Student Mentorship Platform | SRM AP Academic Mentors",
  description = "Friendly Learning SRMAP connects SRM AP university students with experienced peer mentors for academic guidance, project collaboration, and study partnerships. Get personalized help from verified mentors in your department.",
  keywords = "friendly learning srmap, fl srmap, srm ap mentorship, srmap student mentors, academic guidance srm, university mentors srmap, find study partners srm, verified mentors srmap, peer learning srm ap, student collaboration srmap, academic support srm, srm university mentors, hackathon partners srm, project collaboration srmap",
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

    // Geographic and locale targeting - India focus
    updateMetaTag('geo.region', 'IN');
    updateMetaTag('geo.placename', 'India');
    updateMetaTag('language', 'en-IN');
    updateMetaTag('country', 'India');
    updateMetaTag('DC.title', title);
    updateMetaTag('DC.creator', 'Project FL');
    updateMetaTag('DC.subject', keywords);
    updateMetaTag('DC.description', description);

    // Additional SEO meta tags
    updateMetaTag('author', 'Project FL');
    updateMetaTag('publisher', 'Project FL');
    updateMetaTag('application-name', 'Project FL');
    updateMetaTag('theme-color', '#6366f1');
    updateMetaTag('msapplication-TileColor', '#6366f1');
    updateMetaTag('apple-mobile-web-app-capable', 'yes');
    updateMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    updateMetaTag('format-detection', 'telephone=no');

    // Update Open Graph tags
    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', `${window.location.origin}${ogImage}`, true);
    updateMetaTag('og:url', window.location.href, true);
    updateMetaTag('og:type', 'website', true);
    updateMetaTag('og:site_name', 'Project FL', true);
    updateMetaTag('og:locale', 'en_IN', true);
    updateMetaTag('og:country-name', 'India', true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:image:alt', ogTitle || title, true);

    // Update Twitter/X tags
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', ogTitle || title, true);
    updateMetaTag('twitter:description', ogDescription || description, true);
    updateMetaTag('twitter:image', `${window.location.origin}${ogImage}`, true);
    updateMetaTag('twitter:site', '@ProjectFL', true);
    updateMetaTag('twitter:creator', '@ProjectFL', true);

    // Update canonical URL - always use Lovable domain as primary
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }

    if (canonical) {
      canonicalLink.href = canonical;
    } else {
      // Always use Lovable domain as canonical for consistency
      const primaryDomain = 'friendly-learning-srmap.lovable.app';
      const url = new URL(window.location.href);
      url.hostname = primaryDomain;
      url.protocol = 'https:';
      canonicalLink.href = url.toString();
    }

    // Add DNS prefetch for performance
    const dnsPrefetchLinks = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://ruapdkrgcbqrhvsayvpf.supabase.co'
    ];

    dnsPrefetchLinks.forEach(href => {
      let prefetchLink = document.querySelector(`link[rel="dns-prefetch"][href="${href}"]`) as HTMLLinkElement;
      if (!prefetchLink) {
        prefetchLink = document.createElement('link');
        prefetchLink.rel = 'dns-prefetch';
        prefetchLink.href = href;
        document.head.appendChild(prefetchLink);
      }
    });

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

    // Add breadcrumb structured data if not on home page
    if (window.location.pathname !== '/') {
      const breadcrumbData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://friendly-learning-srmap.lovable.app/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": title.split(' | ')[0] || 'Page',
            "item": window.location.href
          }
        ]
      };

      let breadcrumbScript = document.querySelector('#breadcrumb-data') as HTMLScriptElement;
      if (!breadcrumbScript) {
        breadcrumbScript = document.createElement('script');
        breadcrumbScript.id = 'breadcrumb-data';
        breadcrumbScript.type = 'application/ld+json';
        document.head.appendChild(breadcrumbScript);
      }
      breadcrumbScript.textContent = JSON.stringify(breadcrumbData);
    }

    // Add organization structured data
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Project FL",
      "url": "https://friendly-learning-srmap.lovable.app",
      "logo": "https://friendly-learning-srmap.lovable.app/og-image.png",
      "description": "University student collaboration platform connecting students for mentoring, study partnerships, and project collaborations",
      "sameAs": [
        "https://www.project-fl.me"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "url": "https://friendly-learning-srmap.lovable.app/contact"
      }
    };

    let orgScript = document.querySelector('#organization-data') as HTMLScriptElement;
    if (!orgScript) {
      orgScript = document.createElement('script');
      orgScript.id = 'organization-data';
      orgScript.type = 'application/ld+json';
      document.head.appendChild(orgScript);
    }
    orgScript.textContent = JSON.stringify(organizationData);

  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, structuredData]);

  return null;
};

export default SEOHead;
