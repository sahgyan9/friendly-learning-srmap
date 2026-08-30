# Friendly Learning SRMAP

**Friendly Learning SRMAP** is the all-in-one campus platform for SRM AP
students — post ideas, find teammates, search with CampusBrain, rate faculty,
and get mentored by seniors who've already taken your course.

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
| `npm run typecheck` | Type-check with `tsc` |
| `npm run preview` | Preview the production build locally |
| `npm run test:migrations` | Verify Supabase migrations with PGlite |
| `npm run qa:signed-in-sweep` | Run automated Puppeteer visual QA sweep across all routes |
| `npm run qa:screenshot` | Capture mobile and desktop route screenshots |

## Project structure & documentation

- `src/` — application code (pages, components, hooks, Supabase integration)
- `supabase/` — database migrations, edge functions, and storage bucket config
- `scripts/qa/` — Puppeteer visual QA and interaction test harnesses (see [`scripts/qa/README.md`](scripts/qa/README.md))
- `docs/archive/` — archived historical bug fix summaries & notes (see [`docs/archive/README.md`](docs/archive/README.md))
- `public/` — static assets, robots.txt, sitemaps
- `prerender.js` / `generate-dynamic-sitemap.js` — build-time SEO tooling
- Core documentation in root:
  - [`AGENTS.md`](AGENTS.md) — master reference & safety rules for AI coding assistants
  - [`FABLE_BUILD_PLAN.md`](FABLE_BUILD_PLAN.md) — plan of record and roadmap status
  - [`FACULTY_AI_ROADMAP.md`](FACULTY_AI_ROADMAP.md) — AI layer and search architecture
  - [`FRONTEND_BRIEF.md`](FRONTEND_BRIEF.md) — frontend design specifications
  - [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) — deployment targets and procedures
  - [`SEARCH_GUIDE.md`](SEARCH_GUIDE.md) — semantic search guide

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
