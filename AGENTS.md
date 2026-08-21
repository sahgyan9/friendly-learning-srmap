# AGENTS.md — Friendly Learning SRMAP

Portable context for any coding agent (Antigravity, Codex, Cursor, Gemini CLI,
Claude Code). **This file is written to stand alone** — a tool that reads
nothing else still has what it needs.

Per-tool pointers exist alongside it and say the same thing in fewer words:
`.claude/rules/build-plan.md` (Claude Code) and `.agent/rules/build-plan.md`
(Antigravity workspace rules). There is deliberately no `GEMINI.md`: it would
outrank this file for Antigravity, and there is nothing Antigravity-specific to
override — add one only for genuine tool-specific behaviour, never as a copy of
this file.

**What this project is:** a campus platform for SRM University-AP students —
find the right faculty member, senior mentor, group, or hackathon teammate by
describing what you need in plain language. React + Vite + TypeScript +
Tailwind, Supabase (Postgres + edge functions), deployed on Vercel.

## Start here

**[FABLE_BUILD_PLAN.md](FABLE_BUILD_PLAN.md) is the plan of record.** If the
owner (Gyan, non-technical) refers to "the plan", "the plan Fable made", or a
task ID like `T2.3`, that is the file. It lists what shipped with commit
hashes, what remains and why it was deferred, and the known follow-ups. Read it
before proposing work or writing a competing plan; keep its status table
current in the same commit that ships a task.

Deeper authorities it defers to: [FACULTY_AI_ROADMAP.md](FACULTY_AI_ROADMAP.md)
(search and the AI layer, including deliberately rejected approaches) and
[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) (deploy targets).

## Commands

- `npm run dev` — Vite dev server.
- `npm run typecheck` — **the** type check. Bare `tsc` is a no-op in this repo.
- `npm run test:migrations` — PGlite migration harness.
- `npm run build` — sitemap + client + SSR + prerender.
- **ESLint is broken repo-wide.** Skip it; do not fix it as a side quest.
- **The typecheck baseline is 0 errors** (verified 2026-08-22; an earlier
  version of this note said 13 — those were fixed by later refactor commits
  and never credited). Adding any is a regression.

## Rules that will cost you a day if you skip them

- **Three deploy targets, not one:** frontend (Vercel, on push), database
  (migrations run against the project), edge functions (deployed separately).
  Shipping one never ships the others. A migration file in the repo is not a
  migration in the database; an edited function file is not the deployed
  function.
- **HTTP 200 is not proof.** Verify a change by asking *did the data change* —
  query the table, count the rows. This repo has already produced one confident
  false success (627 rows "synced", 0 columns populated).
- **Rehearse schema changes in `BEGIN … ROLLBACK` against production**, with
  assertions that `RAISE EXCEPTION` on failure, before applying. It is cheap and
  it has caught real bugs.
- **Adding a column can revoke read access to a whole table.** Some tables
  (notably `public.faculty`, which withholds `email`) grant column-level
  SELECT, and those grants do not extend to new columns — the first query
  naming one fails `42501` for everyone. Check
  `information_schema.column_privileges` first and `GRANT SELECT (new_col) TO
  anon, authenticated` in the same migration.
- **New tables/functions are exposed by default.** `REVOKE ALL … FROM PUBLIC,
  anon, authenticated` for anything not deliberately an API; revoking from
  `anon` alone is a no-op when the grant is to `PUBLIC`.
- **Keep `verify_jwt = false`** when redeploying edge functions here; they
  authenticate in code, and the platform gate breaks the pg_cron path.
- **`public.users` is owner-only.** Cross-user reads go through a
  `SECURITY DEFINER` RPC, never a widened policy.
- **Adding an entity type to search is three edits** — a projector function, a
  call in `rebuild_knowledge_chunks()`, and a **response group in the
  `semantic-search` function**. Miss the third and rows are retrieved, counted,
  and silently dropped.
- **Callers of `semantic-search` must forward the caller's `Authorization`
  header**, or signed-in-only results (student profiles) silently never appear.
- **Toasts: import from `sonner`.** `@/hooks/use-toast` and
  `@/components/ui/use-toast` are silently dead — that `<Toaster />` is not
  mounted. 36 messages across 14 files were being dropped before this was found.
- **Register new migrations in `supabase/tests/verify-migrations.mjs`** with a
  real behavioural assertion. If it touches pgvector it cannot run in PGlite —
  add it to the SKIP list *with the reason and the production verification you
  actually performed*.
- **This repo sits in a OneDrive-synced folder.** Run `git diff` after every
  edit; files can be silently reverted or re-added, including ones you never
  touched. Stage commits explicitly — never `git add -A` when parallel work may
  be in flight.
- **Screenshot before claiming a UI change is done**, at 360px and desktop, in
  both themes. Reusable Puppeteer harnesses already exist at the repo root
  (`qa-signed-in-sweep.mjs` plants a fake session and stubs Supabase for all
  protected/admin routes; see also `qa-welcome-tour-interests.mjs`,
  `qa-recommended-people.mjs`, `qa-opportunities-loop.mjs`). Reuse them.

## Product red lines — settled, do not re-litigate

- **Never claim SRM University-AP affiliation.** It is a location in copy, never
  an issuer or endorser. The non-affiliation line belongs on external surfaces.
- **Never order named faculty by rating.** Ratings may be displayed; they must
  not rank people. The assistant describes a person using only the tags on file
  — no biography, no quality judgement.
- **Faculty review anonymity is absolute.** Reviewer identity must never reach a
  search chunk, a prompt, or a response.
- The term for a senior student helper is **Mentor**. Certificates are earned
  through 3 genuine two-way exchanges and are never SRM-styled.
- **Interests are messy free text on purpose** — the embedding layer collapses
  synonyms. Do not build a curated taxonomy.

## Messaging & SEO consistency

The platform **evolved from a mentorship directory into a full campus
ecosystem** (posts, groups, CampusMind search, faculty ratings, opportunities,
mentors). The About page and HomeIntro already reflect this — but several SEO
surfaces still say "Student Mentorship Platform." When editing copy in any of
the files below, align to the ecosystem framing, not the old mentorship-only
framing.

**Canonical one-liner (use as the reference pitch):**
> Friendly Learning SRMAP is the all-in-one campus platform for SRM AP
> students — post ideas, find teammates, search with CampusMind, rate faculty,
> and get mentored by seniors who've already taken your course.

**Known drift (as of Aug 2026):**
- `index.html` `<title>`, meta description, OG/Twitter tags — say "mentorship
  platform" and the OG description says **"official"**, violating the
  non-affiliation red line above.
- `src/lib/constants.ts` `APP_DESCRIPTION` — generic mentorship blurb, no
  mention of posts, groups, faculty, or search.
- `src/lib/seo/route-meta.ts` homepage entry — mirrors the stale index.html
  description. Also `/how-it-works` says "worldwide" (it's SRM AP only) and
  `/find-study-partners` + `/hackathon-partners` say "at your university"
  instead of naming SRM AP.
- `index.html` Schema.org block — `@type: "EducationalOrganization"` is wrong;
  the platform is not an educational organisation.

If you touch any of these files, fix the drift in the same commit.

## Note on tooling differences

Recent database and edge-function changes were applied through Claude Code's
Supabase MCP connection, which is why some migration headers say "applied via
MCP apply_migration". Without that connection the equivalent paths are the
Supabase CLI (`supabase db push`, `supabase functions deploy <name>`) or the
dashboard SQL editor — see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md). The
verification obligations above are unchanged whichever path you use.
