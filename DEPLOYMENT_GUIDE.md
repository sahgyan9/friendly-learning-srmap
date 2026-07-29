# Deployment

The site deploys to **Vercel**. `vercel.json` is the only hosting config in the
repo; the Netlify (`netlify.toml`, `public/_redirects`) and Apache
(`public/.htaccess`) equivalents were removed once Vercel became the only
target, because carrying three of them meant three places to forget to update —
and the Apache one was still issuing a 301 to a domain the project no longer
uses.

## SPA routing

React Router handles routing client-side, so a direct request to
`/faculty/dr-anshu-sahu` has no matching file on disk and would 404. The final
catch-all rewrite in `vercel.json` serves `index.html` for those paths and lets
the router take over:

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

### Why the explicit rewrites come first

`npm run build` prerenders one HTML file per public route (`dist/about.html`,
`dist/blog.html`, …). Vercel does not resolve `/about` to `about.html` on its
own unless `cleanUrls` is enabled, so with only the catch-all every route was
served the *homepage* HTML. Crawlers saw homepage content at every URL, and
React logged hydration error #418 on each one because the markup it was handed
never matched the route it was rendering.

`cleanUrls` would fix that in one line, but it also 308-redirects
`/google207de3fb46e51bdf.html` — the Search Console verification file — so the
routes are listed explicitly instead.

**Keep the list in sync with `routesToPrerender` in `prerender.js`.** A route
prerendered but not listed here silently falls through to the catch-all and
regresses to homepage HTML; a route listed here but not prerendered 404s.

## The site's domain

`site.config.js` at the repo root is the single source of truth:

```js
export const SITE_HOST = 'friendly-learning-srmap.vercel.app';
export const SITE_URL = `https://${SITE_HOST}`;
```

Everything derives from it — canonical tags, Open Graph and Twitter metadata,
JSON-LD, and the sitemap generators. Changing hosts is a one-line edit here plus
a regenerated sitemap:

```bash
node generate-dynamic-sitemap.js
```

`index.html` and `public/robots.txt` are static and cannot import the constant,
so their URLs must be updated by hand at the same time. Those are the only two
exceptions.

### Canonical origin vs. runtime origin

Two different ideas, deliberately kept apart in `src/lib/constants.ts`:

- **`PRIMARY_DOMAIN`** — fixed, always `SITE_URL`. Used for SEO, so a preview
  deployment never competes with production in search results.
- **`getAppUrl()`** — whatever host is actually serving the page. Used for OAuth
  `redirectTo`, which has to match where the user really is, or the provider
  returns them to a host they were never on.

Do not collapse these into one value.

## Deploying

Vercel builds on push. To check the output locally first:

```bash
npm run build
```

Then confirm the built HTML points at the right host:

```bash
grep canonical dist/index.html
```

## After a domain change

1. Regenerate and commit the sitemaps.
2. Resubmit the sitemap in Google Search Console.
3. Use URL Inspection to confirm pages are discoverable on the new host.
