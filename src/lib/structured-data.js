/**
 * Structured Data Helper Functions
 * 
 * This file contains helper functions for generating structured data JSON-LD
 * for different page types following Schema.org guidelines.
 */

// Base URL for the site
const baseUrl = "https://www.project-fl.me";

/**
 * Generate Organization schema
 */
export const getOrganizationSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Project FL",
    "url": baseUrl,
    "logo": `${baseUrl}/og-image.png`,
    "description": "University student collaboration platform connecting students for academic help, hackathon partnerships, project collaborations, and finding study partners.",
    "sameAs": [
      "https://friendly-learning.lovable.app",
      // Add social media profiles when available
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "url": `${baseUrl}/contact`
    }
  };
};

/**
 * Generate WebSite schema
 */
export const getWebsiteSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Project FL",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };
};

/**
 * Generate breadcrumb schema
 * @param {Array} items - Array of breadcrumb items with name and url
 */
export const getBreadcrumbSchema = (items) => {
  const itemListElements = items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }));
  
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": itemListElements
  };
};

/**
 * Generate Course schema for mentor offerings
 * @param {Object} mentor - Mentor data
 */
export const getCourseSchema = (mentor, courseTitle, courseDescription) => {
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": courseTitle,
    "description": courseDescription,
    "provider": {
      "@type": "Person",
      "name": mentor.name,
      "url": `${baseUrl}/mentor/${mentor.id}`
    }
  };
};

/**
 * Generate Person schema for mentors
 * @param {Object} mentor - Mentor data
 */
export const getMentorSchema = (mentor) => {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": mentor.name,
    "description": mentor.bio || `${mentor.name} is a mentor on Project FL.`,
    "image": mentor.profile_image,
    "url": `${baseUrl}/mentor/${mentor.id}`,
    "jobTitle": mentor.department ? `${mentor.department} Mentor` : "Mentor",
    "worksFor": {
      "@type": "Organization",
      "name": "Project FL"
    },
    "knowsAbout": mentor.skills || [],
    "alumniOf": mentor.university || "University"
  };
};

/**
 * Generate Article schema for blog posts or community posts
 * @param {Object} post - Post data
 */
export const getArticleSchema = (post) => {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description || post.excerpt || post.title,
    "image": post.image_url || `${baseUrl}/og-image.png`,
    "datePublished": post.created_at,
    "dateModified": post.updated_at || post.created_at,
    "author": {
      "@type": "Person",
      "name": post.author?.name || "Project FL Community Member"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Project FL",
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/og-image.png`
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": post.slug 
        ? `${baseUrl}/blog/${post.slug}` 
        : `${baseUrl}/community-posts/${post.id}`
    }
  };
};

/**
 * Generate FAQ Page schema
 * @param {Array} questions - Array of question/answer objects
 */
export const getFAQSchema = (questions) => {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": questions.map(q => ({
      "@type": "Question",
      "name": q.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": q.answer
      }
    }))
  };
};

/**
 * Generate Event schema for marketplace events
 * @param {Object} event - Event data
 */
export const getEventSchema = (event) => {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "name": event.title,
    "description": event.description,
    "startDate": event.start_date,
    "endDate": event.end_date || event.start_date,
    "location": {
      "@type": "Place",
      "name": event.location || "Project FL Campus",
      "address": event.address || "Campus"
    },
    "image": event.image_url || `${baseUrl}/og-image.png`,
    "organizer": {
      "@type": "Organization",
      "name": event.organizer || "Project FL"
    },
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": event.is_online 
      ? "https://schema.org/OnlineEventAttendanceMode" 
      : "https://schema.org/OfflineEventAttendanceMode",
    "offers": {
      "@type": "Offer",
      "price": event.price || "0",
      "priceCurrency": "INR",
      "availability": "https://schema.org/InStock",
      "validFrom": event.created_at
    }
  };
};
