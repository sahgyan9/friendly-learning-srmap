// Single source of truth for the site's public origin.
//
// This lives at the repo root, in plain JS, because it has two very different
// consumers: the Vite app (via src/config/site.ts) and the Node build scripts
// (prerender.js, generate-sitemap.js, generate-dynamic-sitemap.js). A .ts file
// could not be imported by the latter without a build step.
//
// The domain used to be hardcoded in ~30 places across pages, sitemaps and
// meta tags, which is how the app ended up serving canonical tags for one
// domain and alternate-domain links for another it no longer used. Changing
// hosts should be a one-line edit here.

export const SITE_HOST = 'friendly-learning-srmap.vercel.app';
export const SITE_URL = `https://${SITE_HOST}`;

/** Absolute URL for a site-relative path. `absoluteUrl('/faculty')`. */
export function absoluteUrl(path = '/') {
  return new URL(path, SITE_URL).toString();
}
