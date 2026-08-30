// Application constants
import { SITE_HOST, SITE_URL } from '../../site.config.js';

export { SITE_HOST, SITE_URL };

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Friendly Learning SRMAP';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// The origin the app is actually being served from — localhost in dev, the
// preview URL on a branch deploy, the real domain in production.
//
// Deliberately NOT the same thing as PRIMARY_DOMAIN below. This feeds OAuth
// redirectTo, where the value has to match wherever the user actually is or the
// provider bounces them to a host they were never on.
// The browser's own origin wins whenever there is one. VITE_APP_URL used to be
// checked first, which meant a stale value baked in at build time silently
// hijacked every OAuth redirect — a build carrying an old domain sent users
// there after signing in, no matter which host they had actually started from.
// The env var is now only a fallback for non-browser contexts (SSR, prerender).
export const getAppUrl = () => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return import.meta.env.VITE_APP_URL || SITE_URL;
};

// Cache-Control max-age, in seconds, sent with every image upload.
//
// One year, because none of the upload paths in this app ever reuse a file
// name: each one is a UUID or carries a timestamp, and replacing an image
// writes a new object and repoints the row at it. The bytes behind a given URL
// therefore never change, so there is nothing for a revalidation to discover.
// Supabase's default is 3600, which had every avatar in the app re-fetched
// after an hour for no reason.
export const IMAGE_UPLOAD_CACHE_CONTROL = '31536000';

// Check if we're in development
export const isDevelopment = import.meta.env.DEV;

// The canonical origin for SEO — fixed, regardless of which host served the
// page, so preview deployments never compete with production in search results.
export const PRIMARY_DOMAIN = SITE_URL;

// App metadata
export const APP_DESCRIPTION = 'Ask CampusBrain anything about SRM AP — find peer mentors, faculty by research area, hackathon teammates, and groups in one search. Friendly Learning SRMAP is the free, all-in-one campus platform for SRM AP students.';
export const APP_KEYWORDS = 'CampusBrain, CampusBrain search, campus AI search SRM AP, friendly learning srmap, peer mentors, faculty ratings, hackathon partners, student groups, community posts, study partners, opportunities, SRM University-AP';