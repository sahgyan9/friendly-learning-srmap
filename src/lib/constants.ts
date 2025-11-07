// Application constants
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Friendly Learning SRMAP';
export const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin;
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Get the app URL, preferring custom domain over current origin
export const getAppUrl = () => {
    if (typeof window !== 'undefined') {
        return import.meta.env.VITE_APP_URL || window.location.origin;
    }
    return import.meta.env.VITE_APP_URL || 'https://friendly-learning-srmap.com';
};

// Check if we're in development
export const isDevelopment = import.meta.env.DEV;

// App metadata
export const APP_DESCRIPTION = 'Connect with experienced mentors at SRMAP and accelerate your learning journey through personalized guidance and expert insights.';
export const APP_KEYWORDS = 'mentorship, SRMAP, learning, education, students, mentors, guidance';