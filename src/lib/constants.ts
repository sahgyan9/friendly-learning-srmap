// Application constants
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Friendly Learning SRMAP';
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://friendly-learning-srmap.com';
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Get the app URL, preferring custom domain over current origin
export const getAppUrl = () => {
    if (import.meta.env.VITE_APP_URL) {
        return import.meta.env.VITE_APP_URL;
    }
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'https://friendly-learning-srmap.com';
};

// Check if we're in development
export const isDevelopment = import.meta.env.DEV;

// Primary domain for canonical URLs and SEO
export const PRIMARY_DOMAIN = 'https://friendly-learning-srmap.com';

// App metadata
export const APP_DESCRIPTION = 'Connect with experienced mentors at SRMAP and accelerate your learning journey through personalized guidance and expert insights.';
export const APP_KEYWORDS = 'mentorship, SRMAP, learning, education, students, mentors, guidance';