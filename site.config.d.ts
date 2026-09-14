// Types for site.config.js, which stays plain JS so Node build scripts can
// import it without a build step.
export declare const SITE_HOST: string;
export declare const SITE_URL: string;
export declare function absoluteUrl(path?: string): string;
