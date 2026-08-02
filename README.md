# Friendly Learning SRMAP

**Friendly Learning SRMAP** (FL SRMAP) is a student mentorship platform for SRM
AP university. It connects students with peer mentors for academic guidance,
project collaboration, study partnerships, and hackathon teams.

**Live site**: https://friendly-learning-srmap.vercel.app

## Tech stack

- [Vite](https://vitejs.dev/) + [React](https://react.dev/) + TypeScript
- [shadcn-ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (database, auth, storage, edge functions)
- Deployed on [Vercel](https://vercel.com/), with server-side rendering and
  route prerendering for SEO (see [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md))

## Getting started

Requires Node.js 24.x.

```sh
# Clone the repository
git clone https://github.com/sahgyan9/friendly-learning-srmap.git
cd friendly-learning-srmap

# Install dependencies
npm i

# Copy the env template and fill in your Supabase project details
cp .env.example .env

# Start the dev server
npm run dev
```

See [`.env.example`](.env.example) for the environment variables the app
needs (Supabase URL/anon key, app URL, optional Sentry DSN).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build: sitemap generation, client + SSR bundles, prerendering |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc` |
| `npm run preview` | Preview the production build locally |
| `npm run test:migrations` | Verify Supabase migrations |

## Project structure

- `src/` — application code (pages, components, hooks, Supabase integration)
- `supabase/` — database migrations, edge functions, and storage bucket config
- `public/` — static assets, robots.txt, sitemaps
- `prerender.js` / `generate-dynamic-sitemap.js` — build-time SEO tooling

## Deployment and domain

The site deploys to Vercel on every push to `main`. The canonical domain is
`friendly-learning-srmap.vercel.app`, defined once in
[`site.config.js`](site.config.js) and consumed by the app, sitemaps, and
prerender step.

The project previously ran on Lovable, which briefly got indexed by Google
under `*.lovable.app` ahead of the Vercel domain. Any visitor who lands on a
`lovable.app`, `lovableproject.com`, or `lovable.dev` host is redirected to
the equivalent page on the Vercel domain via a small script at the top of
[`index.html`](index.html), so old search results and bookmarks still resolve
to the live, maintained site. Full details in
[`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md).

## Editing

Clone the repo, make changes locally, and open a pull request — there is no
external editor or drag-and-drop builder involved. Direct edits are also
possible from the GitHub file view or in a Codespace.
