
import { useEffect } from 'react';
import { APP_NAME, APP_DESCRIPTION, APP_KEYWORDS, getAppUrl } from '@/lib/constants';

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
  title = `${APP_NAME} - Student Mentorship Platform | SRM AP Academic Mentors`,
  description = APP_DESCRIPTION,
  keywords = APP_KEYWORDS,
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
    updateMetaTag('og:image', `${getAppUrl()}${ogImage}`, true);
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
    updateMetaTag('twitter:image', `${getAppUrl()}${ogImage}`, true);
    updateMetaTag('twitter:site', '@ProjectFL', true);
    updateMetaTag('twitter:creator', '@ProjectFL', true);

    // Update canonical URL with multi-domain support
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }

    if (canonical) {
      canonicalLink.href = canonical;
    } else {
      // Use Lovable domain as primary canonical
      const currentDomain = window.location.hostname;
      const primaryDomain = 'friendly-learning-srmap.lovable.app';
      const fallbackDomain = 'www.project-fl.me';

      // Always prefer the Lovable domain for canonical URLs
      if (currentDomain === primaryDomain) {
        canonicalLink.href = window.location.href;
      } else {
        // Use Lovable domain as canonical even when on other domains
        const url = new URL(window.location.href);
        url.hostname = primaryDomain;
        canonicalLink.href = url.toString();
      }
    }

    // Add alternate domain links
    const alternateDomains = ['www.project-fl.me'];
    if (window.location.hostname !== 'www.project-fl.me') {
      alternateDomains.push('www.project-fl.me');
    }

    alternateDomains.forEach(domain => {
      if (domain !== window.location.hostname) {
        let alternateLink = document.querySelector(`link[rel="alternate"][href*="${domain}"]`) as HTMLLinkElement;
        if (!alternateLink) {
          alternateLink = document.createElement('link');
          alternateLink.rel = 'alternate';
          alternateLink.href = `https://${domain}${window.location.pathname}${window.location.search}`;
          document.head.appendChild(alternateLink);
        }
      }
    });

    // Add DNS prefetch for performance
    const dnsPrefetchLinks = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      import.meta.env.VITE_SUPABASE_URL || 'https://ruapdkrgcbqrhvsayvpf.supabase.co'
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
    const currentOrigin = window.location.origin;
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Project FL",
      "url": currentOrigin,
      "logo": `${currentOrigin}/og-image.png`,
      "description": "University student collaboration platform connecting students for mentoring, study partnerships, and project collaborations",
      "sameAs": [
        "https://friendly-learning-srmap.lovable.app",
        "https://www.project-fl.me"
      ].filter(url => url !== currentOrigin),
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "url": `${currentOrigin}/contact`
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
