# Project History & Evolution

Reconstructed from `git log` (1,334 commits, 2025-03-01 → 2026-08-31) plus the
other root docs. This is a narrative companion to
[`FABLE_BUILD_PLAN.md`](../FABLE_BUILD_PLAN.md) (the plan of record for what's
left) and [`FACULTY_AI_ROADMAP.md`](../FACULTY_AI_ROADMAP.md) (the AI/search
authority) — read those for what to build next; read this for how the app got
here.

## TL;DR

- Born 2025-03-01 as an AI-generated MVP on **Lovable/GPT-Engineer**, not
  hand-written from scratch.
- 18 months of history, but activity is extremely lumpy: long dormant
  stretches punctuated by short intense bursts. **August 2026 alone accounts
  for 672 of the 1,334 commits (50%).**
- The project changed *how* it was built partway through: free-text Lovable
  commits ("Changes", "Work in progress") gave way to disciplined Conventional
  Commits (`feat(scope): ...`) starting **2026-07-26**, coinciding with the
  move to Claude Code as the primary dev tool.
- One feature was built and later fully removed (collaborative canvas
  whiteboard). One brand name was retired for trademark-conflict reasons
  (CampusMind → CampusBrain).

## Timeline

### Phase 0 — Genesis on Lovable (2025-03-01)

The very first commit, `1956692` *"Implement Friendly Learning MVP"*, was
authored by `gpt-engineer-app[bot]` — the commit bot behind
[Lovable.dev](https://lovable.dev) (formerly GPT-Engineer). The app was
scaffolded with the `vite_react_shadcn_ts` template and, in its first day,
already had a Hero section, mentor cards, a search bar, live mentor search,
Google Sign-In, and a Supabase connection. This is the origin of the current
stack (Vite + React + TypeScript + shadcn-ui + Tailwind + Supabase) — it was
never migrated, just built on continuously for 18 months.

Across the whole history, `gpt-engineer-app[bot]` alone made **455 commits**
— a third of the repo — almost all of them the "Reverted to edit edt-...",
"Changes", "Save plan in Lovable" style messages that Lovable's own commit UI
generates. That noise is filtered out of the phase summaries below but it's
worth knowing it's there if you ever `git log` this repo directly.

### Phase 1 — MVP buildout on Lovable (2025-03 → 2025-08)

Steady, higher-volume activity (80, 128, 34, 119, 81, 85 commits per month).
Core platform assembled prompt-by-prompt:

- User auth (email/password, Google OAuth), mentor registration & profiles
- Mentor↔student messaging
- Gemini AI search (first AI integration, April 2025) alongside plain live
  search, later split into "dynamic search" vs. "AI search"
- Dark mode toggle, button/loading animations, logo
- SEO groundwork: canonical URLs, sitemap, robots.txt (many of the
  `docs/archive/*.md` files date from this phase — read those for the
  fix-level detail on nav, mobile nav, and notifications)
- `DEPLOYMENT_GUIDE.md` added 2025-08-30 (SPA routing/fallback for
  Netlify/Vercel) — the oldest surviving root doc.

### Phase 2 — Sparse maintenance and one dead end (2025-09 → 2026-06)

Activity drops off a cliff: 5, 5, 22, 1, 14, 21 commits across ten months,
including a full quarter (late April → late July 2026) with **zero commits**.
What did happen:

- **Sep–Oct 2025: collaborative canvas whiteboard.** Built as "canvas 1"
  through "canvas 5" plus RLS policy fixes. It did not survive — see
  "Dead ends" below.
- **Nov 2025:** mentor↔user data-sync fixes, plus a run of terse `L1`–`L15`
  commits (undated iterative edits, no message content beyond a label —
  consistent with another round of Lovable-style micro-edits).
- **Mar 2026:** navbar redesign (tubelight nav), testimonial UI, About page
  team member names — explicitly a Lovable session again ("Save plan in
  Lovable" appears in April).
- **Apr 2026:** a security pass ("Fixed critical security issues", "Tightened
  marketplace RLS"), LinkedIn PDF import for mentor profiles, anonymous
  faculty rating, then the trail goes cold for three months.

### Phase 3 — The pivot to disciplined engineering (2026-07-26 onward)

`2026-07-26` is the hinge point: commit messages switch from ad hoc prose to
Conventional Commits (`feat(scope): ...`, `fix(scope): ...`) and every commit
after this point reads like an engineering log rather than a chat transcript.
`FRONTEND_BRIEF.md` (2026-07-31) and `SEARCH_GUIDE.md` (2026-07-31) are the
first docs written in this style. By 2026-08-09, `FABLE_BUILD_PLAN.md` and
`AGENTS.md` formalize this into an actual plan of record, authored by "Claude
Fable 5." This is also when `Claude Sonnet 5 <noreply@anthropic.com>` and
`Claude <noreply@anthropic.com>` start appearing as commit co-authors (10
commits total) — the project became AI-agent-assisted, not just AI-scaffolded.

Late July highlights (the on-ramp before the August surge):
- Real faculty ratings + opened the community board to non-mentor students
- Mentor certificates (earned via 3 real exchanges, publicly verifiable — see
  `certificate-must-be-earned` in memory) with several rounds of visual polish
- Alumni transition system: verify mentors by College ID, let graduating
  mentors convert to alumni in-app
- A real security fix: closed an email-relay hole by moving to a queued
  `send-email-queue` model instead of sending from a DB trigger
- Domain consolidation onto one Vercel deployment
- Dark-mode-by-default flip-flopped twice in two days (made default, reverted,
  made default again) — a visible example of shipping fast and correcting fast

### Phase 4 — The August 2026 blitz (672 commits, 50% of all history)

This is where nearly every current feature was either introduced or
substantially rebuilt. Roughly chronological by first `feat(scope)` commit:

| Date | Feature area introduced |
| --- | --- |
| 2026-07-30/31 | Certificates, alumni conversion, universal navbar search, two-row collapsing nav, mentor-run communities/groups, Google avatar auto-sync |
| 2026-08-04 | First-login welcome tour (onboarding), auto-linkified post/comment URLs, welcome emails for new signups |
| 2026-08-06 | Opportunities/team formation (reusing communities as teams), in-chat emoji picker + call coming-soon modal |
| 2026-08-07 | Cached SRM AP events, unread-count messaging, "New chat" reset for the AI Assistant |
| 2026-08-14 | Faculty detail page redesign (modular profile components, sentiment cards) |
| 2026-08-20 | Multi-key Gemini pooling with 429 failover; canvas whiteboard tables formally dropped |
| 2026-08-21 | Notice management (admin), knowledge-base ingestion of admin content, DB-backed recent search history, CampusMind headline copy |
| 2026-08-26 | Dedicated Attendance & Bunk Predictor page, SRM portal password sync + low-attendance alerts, browser web push notifications, ProfileSetupStudio |
| 2026-08-27 | PWA install prompt (Add to Home Screen + iOS guide) |
| 2026-08-30 | Brand rename CampusMind → CampusBrain; minimalist redesigned search hero |
| 2026-08-31 | Personal timetable resolution in search/chatbot; full blog editor + `blog_posts` self-serve blogging platform |

By scope, the single busiest area was **search** (32 `feat` commits) — the
hybrid vector + full-text retrieval system, AI overviews, click-through
ranking, and the CampusMind/CampusBrain rebrand all landed in this window —
followed by nav (20), db (13), chat (13), admin (13), and mentors (12).

## Dead ends and reversals

Worth knowing about because the code and DB objects were fully removed —
don't go looking for them:

- **Collaborative canvas whiteboard.** Built Sep–Oct 2025 (frontend + RLS
  policies), never mentioned again after Nov 2025, and the underlying tables
  and RPCs were explicitly dropped on 2026-08-20
  (`chore(db): drop legacy canvas whiteboard tables and RPC functions`).
- **CampusMind branding.** Live from 2026-08-15, renamed to CampusBrain on
  2026-08-30 after discovering real trademark conflicts with existing
  higher-ed products (see `campusmind-name-has-real-conflicts` /
  `rejected-brand-name-candidates` in memory — 9 alternate names were checked
  and rejected before landing on CampusBrain).
- **Dark-mode-as-default**, flipped twice within 24 hours on 2026-07-29.
- Two Vercel domains existed at once (`project-fl.me` and the current one);
  consolidated onto one on 2026-07-28.

## Contributors

```
723  sahgyan9 <sahgyan9@gmail.com>            \_ same person, two git identities
128  sahgyan9 <...@users.noreply.github.com>  /
455  gpt-engineer-app[bot]                       Lovable/GPT-Engineer automation
  8  Claude Sonnet 5 <noreply@anthropic.com>     Claude Code co-authored commits
  6  bigyan-sah
  4  nikhilkumar905
  4  Gyan Kumar Sah <sahgyan9@gmail.com>         same person, real-name identity
  3  pankajydv07
  3  abhishek481828
  2  research-engineer-shaktiphotonsolutions
  2  Gyan Kumar Sah <...@users.noreply.github.com>
  2  Claude <noreply@anthropic.com>
```

This has been overwhelmingly a solo project (Gyan, across identities) built
first through Lovable's AI scaffolding and later through Claude Code, with a
handful of friends/collaborators (bigyan-sah, nikhilkumar905, pankajydv07,
abhishek481828) each contributing a few commits.

## Where it stands today

65 routes under `src/pages/`, spanning: mentor discovery & applications,
faculty ratings & AI-summarized profiles, CampusBrain hybrid search with an AI
overview, an AI chatbot (`/ask`), communities/opportunities/team formation,
events, a self-serve community blog, attendance & timetable tracking (synced
from the SRM portal), mentor certificates with public verification, an alumni
track, PWA install support, browser push notifications, and a fairly large
admin surface (articles, badges, notices, mentor verification, security,
search insights, welcome emails, error reports, contact messages).

## What the plan-of-record says is still missing

Per `FABLE_BUILD_PLAN.md` / `FACULTY_AI_ROADMAP.md` (both current as of
2026-08-09 and 2026-08-06 respectively):

- **T2.3 / Phase 2 — Course → faculty mapping** is the only unstarted task in
  either plan. It's deliberately last: it depends on having enough students
  submitting `course_code` on faculty ratings to derive a confident map, not
  on any remaining engineering work. The spec (one-tap "did they teach you,
  which course" contribution, admin-override table, ≥2-report threshold
  before surfacing) is fully written, just waiting on data volume.
- **Faculty availability (Phase 5)** is deferred on purpose, not forgotten —
  see the roadmap for the reasoning.
- Link previews for dynamic routes, once broken for every route, were fixed
  (`29800e3`, `3865d65`) and are marked resolved in the build plan.

If you're looking for "what should I build next," those two docs are the
actual authority — this file is history, not a roadmap.
