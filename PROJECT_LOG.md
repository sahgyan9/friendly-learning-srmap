# PROJECT_LOG.md — Friendly Learning SRMAP

> **Purpose**: This is the single source of truth for all architectural decisions, features built, bugs diagnosed, root causes identified, and session-by-session progress. **All AI agents and contributors MUST read this file before starting work and MUST append an entry at the end of every session.**

---

## How to Use This Log

1. **Before any session**: Read the full log to understand where things stand.
2. **After any session**: Append a new `## Session` entry (see template at the bottom).
3. **Never overwrite** past entries — only append.
4. **Be specific**: Include the exact prompt/task, root causes, files modified, data verification commands, and handoff instructions.
5. **Anti-Slop Compliance**: Adhere strictly to `AI_STYLE_GUIDE.md` (no decorative emojis, direct engineering tone, no corporate filler).

---

## Project Architecture & Deployment Targets

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS, deployed on Vercel.
- **Database**: Supabase Postgres with pgvector and pg_cron.
- **Edge Functions**: Deno TypeScript functions in `supabase/functions/` (`sync-srm-portal`, `import-srm-portal`, `semantic-search`, etc.).
- **Deploy Rule**: Three independent deploy targets (frontend on push, migrations run against DB, edge functions deployed separately). Editing a local file never deploys it.

---

## Session Log

---

### Session 001 — 2026-09-09 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  1. "recently we added, a way to sync srm portal and right now we only have attendance. I wish that we add Time Table. Before we implement, I want you to sync time table of sahgyan9@gmail.com and I will verify that we are able to sync then we will integrate it"
  2. "One thing I would like in this workspace is to avoid AI-ish behaviour of AI Agents and you can learn about it from internet or workspace of mine (C:\Users\sahgy\Downloads\overleaf-copy). I also want to start a markdown file which contain all the log of changes we made as we go, along with learnings so that future ai agents doesn't make same mistakes and it is mandatory for all agents"
- **Root Cause Analysis (RCA)**:
  - **The Timetable Sync Failure**:
    - The platform previously synced student attendance into `public.student_attendance`, but `public.student_timetables` remained empty (0 rows for user `sahgyan9@gmail.com`).
    - Investigation of `supabase/functions/_shared/srm-portal.ts` revealed that `fetchAcademicSections` mapped `timeTableHtml: allSectionsHtml[4] || ""` (Section 5, `ids=5`).
    - Calling the SRM AP student portal (`student.srmap.edu.in/srmapstudentcorner/students/report/studentreportresources.jsp`) with live credentials revealed that **Section 5 is "INTERNAL MARK DETAILS"**. The actual class timetable is **Section 10 (`ids=10`)**.
    - Furthermore:
      1. SRM AP period timing headers use a mix of morning (09:00 To 09:50) and 12-hour afternoon notation (01:00 To 01:50, 04:00 To 05:30 for Hour 8). The previous parser relied on static fallback timings.
      2. Room numbers on SRM AP are rendered in parentheses (e.g. `(X 312)` and `(C 301)`) and in the `#tblSubjectList` summary table, which bypassed the regex looking only for `ALH|UB|CL...`.
      3. Neither `sync-srm-portal` nor `import-srm-portal` deployed in Supabase had the timetable upsert code active in production.
- **What was done**:
  1. **Built & Tested Standalone Portal Parser**:
     - Created `tools/test_fetch_portal_timetable.mjs` to test live login and probe sections 1 through 20 of the SRM portal for account `AP23111260062`.
     - Confirmed Section 10 returns `tblClassTimetable` and `tblSubjectList` (20,331 characters of HTML).
     - Created `tools/test_timetable_parser.mjs` and `tools/apply_timetable_sync.mjs` parsing all 16 class slots with period timings, room numbers, course names, and faculty names.
  2. **Synced Timetable into Database**:
     - Inserted and verified all 16 class slots for `sahgyan9@gmail.com` (`54774a25-67a8-48da-abc7-3621f35fbb26`) into `public.student_timetables`.
     - Tested `public.get_user_weekly_timetable('54774a25-67a8-48da-abc7-3621f35fbb26'::uuid)` RPC and verified all 16 slots return correctly.
  3. **Established Anti-Slop & Documentation Standards**:
     - Created `AI_STYLE_GUIDE.md` defining strict communication and design standards (no emojis in UI, matter-of-fact tone, root cause analysis).
     - Created this `PROJECT_LOG.md` as the permanent memory file.
     - Updated `AGENTS.md` and `.agent/rules/build-plan.md` making `PROJECT_LOG.md` and `AI_STYLE_GUIDE.md` mandatory for all agents.
  4. **Updated Backend Engine**:
     - Fixed `supabase/functions/_shared/srm-portal.ts` to map `timeTableHtml` from Section 10 (`ids=10`) and enhanced `parseTimeTable` with subheader timing extraction, `#tblSubjectList` metadata, and parenthesis room extraction.
- **Verification**:
  - `SELECT count(*) FROM public.student_timetables WHERE user_id = '54774a25-67a8-48da-abc7-3621f35fbb26'` -> **16 rows**.
  - `SELECT * FROM public.get_user_weekly_timetable(...)` -> **16 slots returned with exact room numbers, faculty names, and timings**.
- **Files changed**:
  - NEW: `AI_STYLE_GUIDE.md`, `PROJECT_LOG.md`, `tools/test_fetch_portal_timetable.mjs`, `tools/test_timetable_parser.mjs`, `tools/apply_timetable_sync.mjs`
  - MODIFIED: `AGENTS.md`, `.agent/rules/build-plan.md`, `supabase/functions/_shared/srm-portal.ts`
- **Next steps**:
  - Implement frontend timetable integration matching portal layout (Weekly Matrix View + Course & Faculty Directory) with Attendance preserved as default on an SRM Portal page.

---

### Session 002 — 2026-09-09 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  "great it matched. How would you like to format the table to keep in frontend. What would be the best design choice so that it easy to glance at... why not have a srmportal page and there I can navigate between attendance and timetable. Keep attendance as default. and Keep the timetable for same as portal so that people don't struggle from that habit that they already have (srm portal is just like your weekly matrix suggestion as in image and below it contains the Course & Faculty Directory as your second image)"
- **What was done**:
  1. **Timetable Frontend Components**:
     - Created `src/components/timetable/WeeklyMatrixTable.tsx`: weekly matrix layout mirroring the SRM AP portal with periods 1 to 8 as columns, days Monday to Friday/Saturday as rows, period timings, room tags, and sticky day column on mobile with horizontal scroll.
     - Created `src/components/timetable/CourseFacultyDirectory.tsx`: directory table matching `#tblSubjectList` below the matrix, showing Course Code, Course Name, Type/Hours, Faculty (linked to `/faculty` directory for reviews), and assigned classrooms.
     - Created `src/components/timetable/ActiveScheduleBanner.tsx`: real-time IST schedule banner showing class currently in session, next upcoming class today, or free day status.
  2. **SRM Portal Unified Page**:
     - Enhanced `src/pages/Attendance.tsx` into a unified SRM Portal page (`/srmportal` and `/attendance`).
     - Added segmented tab switcher (`Attendance & Bunk Calculator` vs `Class Timetable`) with course and slot counts.
     - Preserved Attendance as default tab on initial load.
     - Wired URL query param synchronization (`?tab=timetable` vs `?tab=attendance`).
     - Integrated `student_timetables` fetching and offline caching via `getOfflineCache`/`setOfflineCache`.
     - Integrated unified sync button refreshing both attendance and timetable datasets simultaneously.
     - Added interactive bidirectional course highlighting: selecting a course in either the Directory or Matrix highlights all of its slots across both views.
  3. **Routing & Navigation**:
     - Added `/srmportal` route alias in `src/App.tsx`.
     - Updated Navbar profile menu item from "Attendance" to "SRM Portal" (`/srmportal`).
     - Configured route accent in `src/components/navigation/nav-config.ts` and SEO meta in `src/lib/seo/route-meta.ts`.
  4. **Edge Function Deployments**:
     - Deployed updated `sync-srm-portal` and `import-srm-portal` to Supabase (`ruapdkrgcbqrhvsayvpf`) with `--no-verify-jwt` bundling the enhanced `_shared/srm-portal.ts`.
  5. **Visual QA & Verification**:
     - Ran `npm run typecheck` — 0 errors verified.
     - Ran `npm run build` — passed (client bundle, SSR bundle, sitemaps, prerender).
     - Created `scripts/qa/qa-srmportal.mjs` and generated desktop light/dark and mobile 360px screenshots in `.qa-srmportal/`.
- **Status at end**:
  - Full SRM Portal frontend and backend deployed and verified.
  - Timetable matches SRM portal weekly matrix + course & faculty directory.
  - Attendance remains default view.
  - Zero TypeScript regressions (baseline 0 errors).
- **Next agent should**:
  - Maintain the unified `/srmportal` page and continue following `AI_STYLE_GUIDE.md` and `PROJECT_LOG.md`.

---

### Session 003 — 2026-09-09 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  1. "I noticed, my 425 is orange color code, PHY 426 is green and so on but in course & faculty directory all the Color of course code is orange. Which code is responsible for bugs and fix this with commit and push"
  2. "there is discrepency in L-T-P-C/Type as well. Please look into this as well"
  3. "this might help" [User uploaded screenshot showing matrix color vs directory badge color mismatch and L-T-P-C / Type pill clash]
- **Root Cause Analysis (RCA)**:
  - **Issue 1: Course Code Badge Color Discrepancy**:
    - In `src/components/timetable/WeeklyMatrixTable.tsx` (Lines 101–108), courses are dynamically assigned color palettes (`PALETTES`: amber, sky, emerald, purple, rose) based on unique course codes in `slots`. `PHY 425` is amber/orange, `PHY 424` is sky blue, and `PHY 426` is emerald green.
    - In `src/components/timetable/CourseFacultyDirectory.tsx` (Line 106), the course code badge was statically hardcoded to amber/orange (`bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20`) for every single row regardless of course code.
  - **Issue 2: L-T-P-C / Type Discrepancy**:
    - In `CourseFacultyDirectory.tsx` (Lines 115–125), the column was titled `L-T-P-C / Type` and rendered `{item.isLab ? "2-0-2-4 (Lab)" : "3-1-0-4 (Theory)"}` inside emerald green or sky blue pills.
    - This caused three distinct defects:
      1. Hardcoding `2-0-2-4` and `3-1-0-4` as mockup strings instead of real credit structure.
      2. Mislabeling `PHY 424` (`2-0-2-4`) as purely `(Lab)` even though it is an integrated course with 2 lecture hours in classroom C 301 and 2 practical hours in lab X 312.
      3. The green and blue pill styling clashed directly with the course palette colors from the matrix above (where sky was PHY 424 and emerald was PHY 426).
      4. The SRM AP portal (Section 10 `#tblSubjectList`) has the header `L-T-P-C` and values `2-0-2-4` and `3-1-0-4` without fake tags.
    - Furthermore, `public.student_timetables` in Postgres previously lacked an `ltpc` column, so parsed values were not persisted.
- **What was done**:
  1. **Database Schema & Backfill**:
     - Created and applied migration `supabase/migrations/20260909020000_add_ltpc_to_student_timetables.sql` adding `ltpc text` column to `public.student_timetables` with `GRANT SELECT TO authenticated, anon`.
     - Backfilled production database: `PHY 424: 2-0-2-4`, `PHY 425: 2-0-2-4`, `PHY 426: 3-1-0-4`.
     - Registered migration in `supabase/tests/verify-migrations.mjs` and verified clean and upgrade passes via `npm run test:migrations`.
  2. **Edge Function Sync Logic**:
     - Updated `supabase/functions/_shared/srm-portal.ts`, `sync-srm-portal/index.ts`, and `import-srm-portal/index.ts` to include `ltpc` in `ParsedTimetableSlot` and persist `ltpc` during background syncs.
  3. **Frontend Timetable Components**:
     - In `WeeklyMatrixTable.tsx`: Exported `PALETTES` and `getCourseColorMap(slots)`, and added `ltpc?: string | null` to `TimetableSlot`.
     - In `CourseFacultyDirectory.tsx`:
       - Imported `getCourseColorMap` and applied `palette.badge` to each course code badge, synchronizing colors identically with matrix cells.
       - Renamed column header from `L-T-P-C / Type` to `L-T-P-C` matching the official SRM AP portal table.
       - Replaced the hardcoded pills with clean, neutral monospace badges displaying `item.ltpc || "—"`.
- **Status at end**:
  - `npm run typecheck`: 0 errors.
  - `npm run test:migrations`: All checks passed against real Postgres.
  - Visual QA verified: `PHY 424` is sky blue, `PHY 425` is amber, `PHY 426` is emerald across both matrix and directory; L-T-P-C displays exact numbers (`2-0-2-4`, `3-1-0-4`) cleanly.
---

### Session 004 — 2026-09-09 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  1. "if you notice, we have recently added timetable in our platform. I observed many people suffer from find because they don't get notification when the money get raised in their portal. If you see the portal of sahgyan9@gmail.com I have to pay the fee and if i don't pay fee there will be fine. I want my platform to notify users when money is raised in their portal, and even when fine is raised. Our portal should notify money is raised it notifiy that the money is raised Please pay on time to avoid Penalty of Fine. Avoid AI-ish behaviour (you can read doc), ask for any doubt and first verify that you are able to sync Finance data from portal"
  2. Constraints agreed with user: In-app and Web Push only (no emails); tab named "Fee & Finance" on `/srmportal?tab=finance`; daily sync at 5:30 PM IST cron + on-demand manual sync; strict compliance with `AI_STYLE_GUIDE.md`.
- **Root Cause Analysis (RCA)**:
  - **SRM AP Finance Architecture Investigation**:
    - Probed SRM AP student portal endpoints (`student.srmap.edu.in/srmapstudentcorner/`):
      - Active unpaid fee dues do **NOT** live in `studentreportresources.jsp`. They live in `students/transaction/feeduegroups.jsp` with POST `ids=8`.
      - Historical fee payments and receipts live in `students/report/studentreportresources.jsp` with POST `ids=7` (`#tbl7`).
      - Account `AP23111260062` (`sahgyan9@gmail.com`) currently has INR 1,47,900 in pending Hostel Fees (Mess: 73,950.00; Room Rent: 73,950.00) and 15 historical receipts.
    - **Notification Constraint Requirement**:
      - `public.notifications.type` had a CHECK constraint (`notifications_type_check`) that rejected any type other than legacy types. Inserting `fee_alert` caused Postgres error `23514`.
    - **Data Integrity & RLS**:
      - Separate tables `public.student_fee_dues` and `public.student_fee_paid_history` were needed with user-scoped RLS policies and `authenticated`/`service_role` grants.
- **What was done**:
  1. **Portal Parser & Live Ingestion**:
     - Added `parseFeeDues` and `parseFeePaidHistory` in `supabase/functions/_shared/srm-portal.ts`, tested in `tools/test_finance_parser.mjs`.
     - Updated `fetchAcademicSections` to fetch `feeduegroups.jsp` (`ids=8`) and `studentreportresources.jsp` (`ids=7`).
  2. **Database Schema & Live Persistence**:
     - Applied migration `supabase/migrations/20260909030000_student_finance_and_fee_alerts.sql` with `public.student_fee_dues`, `public.student_fee_paid_history`, RLS policies, and `notifications_type_check` extended with `'fee_alert'`.
     - Populated live dues and history for `sahgyan9@gmail.com` in production DB (`ruapdkrgcbqrhvsayvpf`): 2 dues rows (INR 147,900.00), 15 history rows, and an in-app `fee_alert` notification.
     - Registered migration in `supabase/tests/verify-migrations.mjs`; clean and upgrade passes verified via `npm run test:migrations`.
  3. **Edge Functions**:
     - Updated `sync-srm-portal` and `import-srm-portal` with finance ingestion, fine/fee difference detection, deduplication against recent notifications, in-app notification creation, and `send-push` dispatch.
     - Deployed both functions to Supabase production with `--no-verify-jwt`.
  4. **Frontend Integration**:
     - Created `src/components/finance/FeeFinanceOverview.tsx`: displays outstanding balance (₹1,47,900), "Pay on SRM Portal" direct portal link, penalty notice with "Please pay on time to avoid Penalty of Fine", dues breakdown table with fine badges, and collapsible receipt history with Indian rupee formatting.
     - Integrated 3rd tab `Fee & Finance` (`?tab=finance`) into `src/pages/Attendance.tsx` with offline caching (`finance_dues`, `finance_history`), pulse dot on active dues, and unified manual sync.
     - Updated `src/utils/notificationNavigation.ts` to navigate `fee_alert` to `/srmportal?tab=finance`.
     - Regenerated `src/integrations/supabase/types.ts` with updated database schema.
  5. **Verification**:
     - `npm run typecheck`: 0 errors.
     - `npm run build`: Success (client, SSR, dynamic sitemaps, prerender).
     - `npm run test:migrations`: All checks passed on Postgres clean & upgrade scenarios.
     - Visual QA: Puppeteer tests captured desktop (light/dark) and mobile 360px (light/dark) in `.qa-srmportal/`.
- **Status at end**:
  - Live finance data synced and verified in production Postgres for `sahgyan9@gmail.com`.
  - Frontend `Fee & Finance` tab fully functional with offline support and responsive design.
  - Zero TypeScript errors (baseline maintained at 0).
- **Next agent should**:
  - Preserve `student_fee_dues` and `student_fee_paid_history` RLS and follow `PROJECT_LOG.md` and `AI_STYLE_GUIDE.md`.

---

## Session Template (copy for each new session)

```markdown
### Session XXX — YYYY-MM-DD · Agent: [Name / Model]
- **Prompt**: (exact user instruction or task description)
- **What was done**: (bullet list of changes made, files touched, commands run)
- **Root Cause Analysis (RCA)**: (detailed diagnosis and technical mechanics)
- **Status at end**: (verified data changes, database row counts, test passes)
- **Next agent should**: (clear handoff instructions for the next session)
```

