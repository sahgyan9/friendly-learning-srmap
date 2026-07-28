
import { useEffect } from 'react';
import { APP_NAME, APP_DESCRIPTION, APP_KEYWORDS, PRIMARY_DOMAIN, SITE_HOST } from '@/lib/constants';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  /** `article` for blog posts, so shares render with article metadata. */
  ogType?: "website" | "article";
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
  ogType = "website",
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
    updateMetaTag('DC.creator', 'Friendly Learning SRMAP');
    updateMetaTag('DC.subject', keywords);
    updateMetaTag('DC.description', description);

    // Additional SEO meta tags
    updateMetaTag('author', 'Friendly Learning SRMAP');
    updateMetaTag('publisher', 'Friendly Learning SRMAP');
    updateMetaTag('application-name', 'Friendly Learning SRMAP');
    updateMetaTag('theme-color', '#6366f1');
    updateMetaTag('msapplication-TileColor', '#6366f1');
    updateMetaTag('apple-mobile-web-app-capable', 'yes');
    updateMetaTag('apple-mobile-web-app-status-bar-style', 'default');
    updateMetaTag('format-detection', 'telephone=no');

    // Update Open Graph tags
    updateMetaTag('og:title', ogTitle || title, true);
    updateMetaTag('og:description', ogDescription || description, true);
    updateMetaTag('og:image', `${PRIMARY_DOMAIN}${ogImage}`, true);
    updateMetaTag('og:url', window.location.href, true);
    updateMetaTag('og:type', ogType, true);
    updateMetaTag('og:site_name', APP_NAME, true);
    updateMetaTag('og:locale', 'en_IN', true);
    updateMetaTag('og:country-name', 'India', true);
    updateMetaTag('og:image:width', '1200', true);
    updateMetaTag('og:image:height', '630', true);
    updateMetaTag('og:image:alt', ogTitle || title, true);

    // Update Twitter/X tags
    updateMetaTag('twitter:card', 'summary_large_image', true);
    updateMetaTag('twitter:title', ogTitle || title, true);
    updateMetaTag('twitter:description', ogDescription || description, true);
    updateMetaTag('twitter:image', `${PRIMARY_DOMAIN}${ogImage}`, true);
    updateMetaTag('twitter:site', '@FriendlyLearnAP', true);
    updateMetaTag('twitter:creator', '@FriendlyLearnAP', true);

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
      // Canonical always points at SITE_HOST, whatever host actually served the
      // page — so preview deployments and any parked domain still credit the
      // canonical origin rather than competing with it.
      const url = new URL(window.location.href);
      url.hostname = SITE_HOST;
      url.protocol = 'https:';
      url.port = '';
      canonicalLink.href = url.toString();
    }

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
            "item": `${PRIMARY_DOMAIN}/`
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

    // Add organization structured data. Every URL here is the canonical origin
    // rather than window.location.origin — structured data emitted from a
    // preview deployment should still describe the real site.
    const organizationData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Friendly Learning SRMAP",
      "url": PRIMARY_DOMAIN,
      "logo": `${PRIMARY_DOMAIN}/og-image.png`,
      "description": "University student collaboration platform connecting students for mentoring, study partnerships, and project collaborations",
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "url": `${PRIMARY_DOMAIN}/contact`
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

  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, ogType, structuredData]);

  return null;
};

export default SEOHead;
