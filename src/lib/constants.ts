// Application constants
import { SITE_HOST, SITE_URL } from '../../site.config.js';

export { SITE_HOST, SITE_URL };

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Friendly Learning SRMAP';
export const APP_URL = import.meta.env.VITE_APP_URL || SITE_URL;
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// The origin the app is actually being served from — localhost in dev, the
// preview URL on a branch deploy, the real domain in production.
//
// Deliberately NOT the same thing as PRIMARY_DOMAIN below. This feeds OAuth
// redirectTo, where the value has to match wherever the user actually is or the
// provider bounces them to a host they were never on.
export const getAppUrl = () => {
    if (import.meta.env.VITE_APP_URL) {
        return import.meta.env.VITE_APP_URL;
    }
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return SITE_URL;
};

// Check if we're in development
export const isDevelopment = import.meta.env.DEV;

// The canonical origin for SEO — fixed, regardless of which host served the
// page, so preview deployments never compete with production in search results.
export const PRIMARY_DOMAIN = SITE_URL;

// App metadata
export const APP_DESCRIPTION = 'Connect with experienced mentors at SRMAP and accelerate your learning journey through personalized guidance and expert insights.';
export const APP_KEYWORDS = 'mentorship, SRMAP, learning, education, students, mentors, guidance';