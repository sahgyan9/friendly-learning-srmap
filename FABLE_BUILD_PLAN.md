# The Fable build plan — status, and how to continue it

**If Gyan says "there was a plan made by Fable" — this is that plan.** Read this
file first, then pick up from [What is left](#what-is-left).

Authored and executed 2026-08-08/09 by Claude Fable 5, working from commit
`06741d5`. Twelve commits, `fbb28ca` → `0f3626e`, all pushed to `main` and live.
Live status page (same content, prettier):
<https://claude.ai/code/artifact/4d0e336b-8ac2-4ee3-b0de-ed1e4f0dff4e>

Gyan is non-technical and delegates execution decisions. He asked for a plan
detailed enough that any agent could implement it exactly, then approved
executing it with parallel Sonnet subagents verified by the orchestrator. That
division is why the tasks below read as specs rather than notes: **an
implementing agent should not need to make product judgment calls.**

---

## What this plan was for

LinkedIn is for jobs; Slack is for companies; nothing serves the inside of a
university. Friendly Learning lets an SRM AP student — especially a fresher —
search "battery technology" or "hackathon partner" and get the right faculty
member, senior mentor, group, or opportunity in one answer.

The build was already ahead of the distribution (≈27 accounts against 624
faculty), so the plan deliberately prioritised **trust**, **relevance**, and
**visible reliability** over new machinery. The next hundred users each arrive
once, look around for ninety seconds, and decide.

---

## Status of every task

| ID | Task | Status | Commit |
| --- | --- | --- | --- |
| T1.1 | QA sweep, every route × mobile/desktop × light/dark, signed-out **and** signed-in | DONE | `012e9c2` |
| T1.2 | Trust pages + sitewide non-affiliation line | DONE | `fbb28ca` |
| T1.3 | Design-consistency pass against the token system | DONE | `d88ce46` |
| T2.1 | Student interests → searchable people (opt-in) | DONE | `feed74c` (db) + `9010811` (ui) |
| T2.2 | Recommendations — "suggest someone for me" | DONE | `58bf949` |
| T2.3 | Course → faculty map | **NOT STARTED — on purpose** | — |
| T3.1 | Opportunities loop hardening + sharing | DONE | `25b0b46` |
| T3.2 | Capture interests during onboarding | DONE | `9e1bea5` |
| T4.1 | Admin health panel | DONE | `55e8325` (rpc) + `0f3626e` (ui) |
| T4.2 | Migration test coverage catch-up | DONE | `f93d7ce` |
| — | Sitewide dead-toast sweep (discovered mid-plan) | DONE | `366cde6` |

### What each shipped task actually put in front of a user

- **Trust** — `/how-verification-works` and `/your-data`, every claim checked
  against the code that implements it before it was written. "Independent
  student project — not affiliated with or endorsed by SRM University AP" now
  renders in the footer of every page. `MentorsFooter.tsx` was deleted: it was a
  duplicate footer that silently missed sitewide footer changes.
- **Mobile admin** — all nine admin routes scrolled sideways at 360px. Root
  cause worth remembering: the 280px sidebar never collapsed, and bare Tailwind
  `grid` / default flex items have no bounded minimum width, so a nowrap CTA or
  a data table grows the page instead of wrapping. Fixed in nine components.
- **Student discovery** — `users.interests text[]` +
  `users.interests_discoverable boolean` (default **false**). Opting in projects
  a `'student'` chunk with `visibility='signed_in'`; `search_knowledge()` only
  returns that visibility when `p_viewer IS NOT NULL`, so a signed-out caller
  structurally cannot receive a student. Opting out deletes the chunk in the
  same statement via a per-row trigger.
- **Recommendations** — `RecommendedPeople` on the signed-in homepage builds a
  *deterministic* profile query string (sorted, lowercased) so the existing
  server-side query cache absorbs repeats: one embedding per profile change,
  not per visit. No interests and no department renders a prompt card; an error
  renders nothing at all.
- **Onboarding** — a final welcome-tour step embedding the same interests
  editor. Writes only when state actually changed: skip writes nothing, and a
  replay with no edits produces zero PATCHes.
- **Sharing** — WhatsApp + copy-link on opportunity detail pages.
- **Health** — `admin_health_metrics()` and green/amber/red tiles for the email
  queue, search-index backlog and background-job freshness, each with one
  plain-language sentence saying what to do when it is not green.

---

## What is left

### T2.3 — Course → faculty map (the only unstarted plan task)

Deliberately last: it is not blocked on engineering, it is blocked on having
students. It derives from `course_code` on faculty ratings, and there were 2
ratings when the plan was written. Full spec and reasoning live in
[FACULTY_AI_ROADMAP.md](FACULTY_AI_ROADMAP.md) under "Phase 2". The shape:

1. Derive who-teaches-what from `course_code` on ratings, row count as a
   confidence score.
2. Add the one-tap contribution — *"Did they teach you? Which course?"* —
   decoupled from leaving a full rating. The SRM portal import (`06741d5`)
   means students already have their course list in the product; offer their
   imported courses as the tap targets.
3. Admin-override table that wins wherever it has data.
4. Surface a course on the faculty profile at ≥2 independent reports, labelled
   as student-reported, never official. Add a `course` projector + a
   `courses` response group in `semantic-search`.

**Trap:** `public.faculty` uses column-level grants — a new column without an
explicit `GRANT SELECT (col) TO anon, authenticated` 401s the whole public
directory. See `.claude/rules/supabase-changes.md`.

### Follow-ups discovered while executing (not in the original plan)

1. ~~**Link previews are broken for every dynamic route.**~~ **FIXED**
   (`29800e3` "Dynamic Link Previews via prerender.js", `3865d65` "fix(seo):
   update dynamic sitemap generation, prerendering, and 404 route handling").
   `prerender.js` now fetches faculty/opportunities/mentors/communities from
   Supabase at build time and writes real per-entity `<title>`/description/OG
   HTML for the top 100 faculty, 50 opportunities, 50 mentors, and 100
   communities, reusing the faculty cursor pattern this note originally
   proposed; `vercel.json` has matching per-route-type rewrites instead of one
   catch-all. Residual gap, narrower than before: anything beyond those
   per-type caps still falls through to the generic `index.html` and ships
   homepage metadata — worth a decision on raising the caps or an on-demand
   path for the long tail, but not the open "no mechanism exists" problem this
   entry originally described.
2. **`BadgeCreationForm.tsx`'s "Badge name is required" toast is unreachable** —
   the `<Input required>` HTML5 attribute blocks submission before the JS check
   runs.
3. **`CommunityWorkspaceHeader` renders "1 members."** Shared component, used
   well beyond opportunities; fix with the same `count === 1 ? "" : "s"`
   convention now used in `Mentors.tsx`.
4. **13 pre-existing typecheck errors** in `CommunityLinkPreview.tsx`,
   `MentorHeroHeader.tsx`, `MentorProfileContent.tsx`, `communities.ts`,
   `community-posts.ts`, `mentor-verification.ts`, `emoji-utils.ts`,
   `mentor-enhancements.ts`. Untouched all session and used as the baseline —
   "13" is the pass mark, not zero. Worth a dedicated cleanup.

---

## Rules an implementing agent must follow

`.claude/rules/` is loaded automatically and is authoritative — especially
[supabase-changes.md](.claude/rules/supabase-changes.md) (three deploy targets,
HTTP 200 is not proof, column grants, `verify_jwt = false`, OneDrive reverts).
What follows are the additions this session earned.

- **`npm run typecheck` is the check.** Bare `tsc` is a no-op here. ESLint is
  broken repo-wide — skip it, do not fix it as a side quest. The baseline is
  **13 errors**; adding a fourteenth is a regression.
- **Verify a database change by reading the data, never the response.** Every
  schema change this session was rehearsed against production inside
  `BEGIN … ROLLBACK` with assertions that `RAISE EXCEPTION` on failure, applied,
  then re-queried to confirm. The rehearsal is cheap and it has caught real
  bugs.
- **A pgvector-touching migration cannot run in the PGlite harness.** Add it to
  the SKIP list in `supabase/tests/verify-migrations.mjs` **with the reason and
  the production verification you actually performed** — not just "skipped".
- **Adding an entity type to search is three edits, and the third is the one
  people forget:** a projector function, a call in `rebuild_knowledge_chunks()`,
  and a **response group in `semantic-search`**. Without the group the rows are
  retrieved, counted in `total`, and silently dropped.
- **Edge functions do not forward auth by accident.** `ai-chatbot` called
  `semantic-search` with no Authorization header, so it was permanently
  anonymous and could never have surfaced a student. If a feature depends on
  viewer identity, trace the header the whole way down.
- **Toasts: import from `sonner`, never `@/hooks/use-toast`.** The shadcn
  `<Toaster />` is not mounted anywhere in this app; 36 messages across 14 files
  were being silently dropped. `@/components/ui/use-toast` is a re-export of the
  same dead hook — also avoid.
- **Stage commits explicitly.** Never `git add -A` while subagents may have
  in-flight edits. Multi-line commit messages: write to a temp file and use
  `git commit -F`; embedded quotes break PowerShell argument parsing.
- **Screenshot before claiming done.** Both viewports, both themes. The repo's
  harnesses — `qa-signed-in-sweep.mjs` (planted session, stubbed Supabase, all
  protected/admin routes), `qa-welcome-tour-interests.mjs` (PATCH-body capture),
  `qa-recommended-people.mjs`, `qa-opportunities-loop.mjs` — exist to be reused,
  not reinvented.

### Product red lines (settled; do not re-litigate)

Never claim SRM University-AP affiliation — it is a location in copy, never an
issuer or endorser. Never order named faculty by rating. The assistant describes
a person using only the tags on file. The term is **Mentor**. Certificates are
earned through 3 genuine two-way exchanges. Faculty review anonymity is
absolute. Interests are messy free text **on purpose** — the embedding layer
collapses synonyms, so do not build a curated taxonomy.

---

## Related documents, and which one wins

- [AGENTS.md](AGENTS.md) — the **tool-neutral** entry point (Antigravity, Codex,
  Cursor, Gemini CLI all read it at session start; `.claude/rules/` is Claude
  Code only). It points here and carries a condensed copy of the rules below.
  When a rule in this file changes, check whether AGENTS.md repeats it.
- [FACULTY_AI_ROADMAP.md](FACULTY_AI_ROADMAP.md) — **plan of record for search
  and the AI layer**, including approaches deliberately rejected. This file
  defers to it on anything retrieval-related.
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — the three deploy targets.
- [RECOMMENDATIONS_ROADMAP.md](RECOMMENDATIONS_ROADMAP.md) — *behavioural*
  recommendations (collaborative filtering), still parked and still correct to
  park. **T2.2 is not that feature**: it is content-based, matching stated
  interests through the existing embedding layer, needing no interaction volume.
- [brand_assets/BRAND_GUIDELINES.md](brand_assets/BRAND_GUIDELINES.md) — §4 is
  the non-affiliation rule.
