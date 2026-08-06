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

---

# Supabase: three deploy targets, not one

This is the section that did not exist on 2026-08-06, and its absence cost a
confusing hour. **The frontend, the database schema, and the edge functions are
three separate deploys.** Shipping one never ships the others.

| What changed | How it reaches production | Shipping the others does *not* do this |
|---|---|---|
| `src/**` | `git push` → Vercel builds | — |
| `supabase/migrations/*.sql` | Run the SQL against the project (dashboard SQL editor, or `supabase db push`) | A Vercel deploy never touches the database |
| `supabase/functions/*/index.ts` | `npx supabase functions deploy <name>` (or paste in the dashboard) | Neither a Vercel deploy nor running a migration updates a function |

## The failure this prevents

A migration added `faculty.interests`, and `sync-faculty/index.ts` was edited to
populate it. The migration was applied; the function was not deployed. Running
the sync returned:

```json
{"synced": 627, "retired": 0, "departments": 28}
```

HTTP 200. Twenty-eight departments. Six hundred and twenty-seven rows. Every
number in that response was true, and `interests` was empty on all 627 of them,
because the deployed function was still the previous version and had never heard
of the column.

**A 200 means the code that ran did not crash. It does not mean the code that ran
was the code you wrote.** After changing a function, the check that settles it is
always "did the data change?", never "did it return 200?".

## Verifying a function deploy

Confirm the version number moved:

```bash
npx supabase functions list        # `version` increments on every deploy
```

Then assert on the data the function was supposed to write. For `sync-faculty`:

```sql
SELECT count(*) FILTER (WHERE interests <> '{}') AS with_interests,
       count(*)                                  AS total_active,
       max(last_synced_at)                       AS last_sync
FROM public.faculty WHERE is_active;
```

`last_synced_at` moving while `with_interests` stays at 0 is the exact signature
of a stale function against a fresh schema.

## Running sync-faculty by hand

It rejects anonymous callers — it wants either an admin JWT or the shared cron
secret (see the AUTH note at the top of `supabase/functions/sync-faculty/index.ts`).
The shortest path needs no CLI and no tokens: run what the monthly cron job runs,
from the SQL editor.

```sql
SELECT net.http_post(
  url     := 'https://<project-ref>.supabase.co/functions/v1/sync-faculty',
  body    := '{}'::jsonb,
  headers := jsonb_build_object(
    'Content-Type',  'application/json',
    'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets
                      WHERE name = 'sync_faculty_cron_secret')
  ),
  timeout_milliseconds := 180000
);
```

`net.http_post` is **asynchronous**. It returns a request id immediately — a bare
number like `2086`, which is a ticket, not a result. The run takes ~60s (it pages
~20 times through the `interest` taxonomy). Collect the actual outcome with:

```sql
SELECT status_code, error_msg, content
FROM net._http_response WHERE id = <the number you got back>;
```

A row appears there only once the request finishes.

## Redeploying an edge function

Every function in this project sets `verify_jwt = false` in `supabase/config.toml`
and authenticates itself in code. **Preserve that flag when redeploying.** The
platform JWT gate would only verify the anon key — which ships in the client
bundle and therefore proves nothing — while breaking the pg_cron path, which
carries no user JWT at all.

## Grants on new functions

Postgres grants EXECUTE on every new function to `PUBLIC`, and Supabase *also*
ships `ALTER DEFAULT PRIVILEGES` granting it to `anon` and `authenticated`.
Those are separate grants: `REVOKE ... FROM PUBLIC` alone leaves the role grants
standing. Anything not meant to be an API — trigger helpers especially — needs

```sql
REVOKE ALL ON FUNCTION public.<name>(<args>) FROM PUBLIC, anon, authenticated;
```

which lands it at `postgres=X service_role=X`, matching every other locked-down
helper in the database. See `20260804170000_lock_down_anon_rpc_surface.sql`.
