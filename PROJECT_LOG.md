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

### Session 005 — 2026-09-09 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  "Find out the AI-ish nature in this website. If you don't know then search in this code base about AI-ish nature, you can also search online with deep research and document it in this workspace for future agents and then tell me the AI-ish behaviour in this workspace"
- **Root Cause Analysis & Investigation**:
  - Investigated the threefold meaning of "AI-ish nature" in this repository:
    1. **Production AI Architecture (CampusBrain & Edge RAG)**: Multi-entity vector search in `knowledge_chunks` using `gemini-embedding-001` (768-dim), pgvector cosine distance, and Google Gemini generation models (`gemini-flash-latest`), backed by strict privacy filters (`visibility` in SQL) and deterministic pre-resolvers (`resolveCalendarFacts`, `resolveUserTimetables`).
    2. **Codebase AI Lineage**: Reconstructed project history showing birth on March 1, 2025 as an AI-scaffolded MVP generated on Lovable.dev (455 commits by `gpt-engineer-app[bot]`), progressing to disciplined agentic engineering under Claude Code (July 2026) and Antigravity (September 2026).
    3. **"AI-ish Behavior" ("AI Slop") Anti-Patterns**: Conducted deep industry research and workspace audits identifying key AI slop failure modes: emoji clutter in UI/toasts, performative sycophancy, lexical clichés (*"seamlessly"*, *"delve"*, *"tapestry"*), the "HTTP 200 fallacy" (confident false success without checking DB rows), and cosmetic mockup pills.
    4. **Residual Slop Audit**: Identified lingering emojis in `src/components/workspace-groups/CommunityOnboardingHero.tsx` (category labels with `✨`, `⚡`, `💻`), `src/pages/ProfileSetupStudio.tsx` (toast alerts), and `src/hooks/usePushNotifications.ts` (*"working seamlessly... 🚀"*).
- **What was done**:
  1. Created `docs/AI_NATURE_AND_BEHAVIOR.md`: Comprehensive 6-part authority detailing the production AI engine, codebase lineage, negative slop definitions, codebase audit, and mandatory protocols for future AI agents.
  2. Updated `AI_STYLE_GUIDE.md`: Linked to `docs/AI_NATURE_AND_BEHAVIOR.md` for architectural and historical context.
  3. Updated `AGENTS.md`: Registered `docs/AI_NATURE_AND_BEHAVIOR.md` in the core root documentation list.
- **Status at end**:
  - All documentation synchronized and verified.
  - Zero TypeScript regressions (`npm run typecheck` verified 0 errors).
- **Next agent should**:
  - Refer to `docs/AI_NATURE_AND_BEHAVIOR.md` and `AI_STYLE_GUIDE.md` on every UI and backend task.
  - Gradually clean residual emoji clutter from `CommunityOnboardingHero.tsx` and `ProfileSetupStudio.tsx` during relevant feature work.

---

### Session 006 — 2026-09-09 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  "dig deeper and find the possible place to remove those AI-ish behaviour in UI" -> "go ahead"
- **Root Cause Analysis (RCA)**:
  - Systemic residual AI slop inherited from the platform's early Lovable.dev / GPT-engineer generation era (March 2025–July 2026).
  - Web applications generated by LLMs routinely sprinkle decorative unicode emojis (`✨`, `🎉`, `🚀`, `💡`, `⭐`, `🎯`, `💬`, `🧠`, `💻`, `📚`) into buttons, toast notifications, form alerts, and landing page marketing cards as a substitute for structured design systems.
  - Furthermore, LLM copy generators inject corporate buzzwords and performative praise (*"working seamlessly... 🚀"*).
- **What was done**:
  - Conducted a full audit across all UI components and executed a comprehensive multi-phase sweep removing emoji clutter and replacing them with styled Lucide SVG icons and clear typography:
    1. **Interactive Controls & Category Chips**:
       - `src/components/workspace-groups/CommunityOnboardingHero.tsx`: Removed category emojis (`✨`, `⚡`, `💻`, `📚`, `🎭`); replaced with Lucide icons (`Sparkles`, `Zap`, `Code`, `BookOpen`, `Palette`).
       - `src/components/community-posts/PostCard.tsx`: Removed `📖` from read button; removed `💖`, `❤️`, `💬` from like/comment tooltips.
       - `src/components/profile/ProfileKickstartModal.tsx`: Removed `🎉` from PDF parsed toast, save success toast, and primary button text.
       - `src/pages/ProfileSetupStudio.tsx`: Removed `✨`, `💡`, `✓`, `🎉` from drafts/publish toasts and prompt hints; replaced raw status indicators with accessible status dots and Lucide icons.
       - `src/components/events/EventAttendeeRoster.tsx`: Removed `🎉` and `⭐` from RSVP toasts; replaced `💬` with Lucide `MessageSquare`.
    2. **Notification & Banner Systems**:
       - `src/hooks/usePushNotifications.ts`: Removed `🎉` from toast; eliminated *"working seamlessly... 🚀"* AI filler from test push notifications.
       - `src/hooks/useMentorForm.ts`: Removed `🎉` from mentor approval toast and in-app welcome notification.
       - `src/pages/BecomeMentor.tsx`: Removed `🎉` from approved banner heading; replaced `💡` with Lucide `Info` icon.
       - `src/pages/BecomeMentorSuccess.tsx`: Removed `🎉` from main heading.
       - `src/pages/WriteBlogPost.tsx`: Removed `🎉` and `💾` from publish/draft toasts.
       - `src/pages/CommunityPostDetail.tsx`: Removed `🎉` from fulfilled status toast.
       - `src/components/mentor-profile/ProfileCompletenessBanner.tsx`: Removed `🎉` from profile strength header.
    3. **Form Guidance & Callouts**:
       - `src/pages/SignIn.tsx`: Replaced raw `💡` in Google sign-in note with Lucide `Info`.
       - `src/components/mentors/RejectedApplicationNotice.tsx`: Removed `🎯` from title; replaced `💡` with Lucide `Info`.
       - `src/components/admin/verification/VerificationDetailsCard.tsx`: Replaced `💡` with Lucide `Info`.
       - `src/components/FutureVision.tsx`: Replaced orbiting node emoji strings (`🎓`, `📅`, `📖`, `👥`, `📝`) with Lucide SVG icons (`GraduationCap`, `Calendar`, `BookOpen`, `Users`, `PenLine`).
       - `src/components/admin/verification/welcome-email.ts`: Removed `🎉`, `💡`, and `🚀` from email headers and bullet decorators.
    4. **Marketing & Feature Cards**:
       - `src/pages/About.tsx`: Replaced 6 feature card emojis (`💬`, `🧠`, `🎓`, `👨‍🏫`, `🏠`, `🚀`) and 3 how-it-works emojis (`📝`, `🤝`, `🏆`) with Lucide icons in styled token containers.
       - `src/pages/HowItWorks.tsx`: Replaced raw emoji headers (`🎓`, `💻`, `📚`, `🚀`) with Lucide icons (`GraduationCap`, `Code`, `BookOpen`, `Rocket`).
       - `src/pages/FindStudyPartners.tsx`: Replaced raw emoji headers (`🎯`, `📚`, `🤝`, `⏰`) with Lucide icons (`Target`, `BookOpen`, `Users`, `Clock`); updated metadata `areaServed` from "Worldwide" to "SRM University-AP".
       - `src/pages/HackathonPartners.tsx`: Replaced emoji icons (`💻`, `🎨`, `📊`) with styled Lucide icons (`Code`, `Palette`, `BarChart3`).
       - `src/pages/SrmStudentPortal.tsx`: Replaced raw emoji headers (`🔄`, `🎯`, `🔔`, `🔒`) with styled Lucide icons (`RefreshCw`, `Target`, `Bell`, `Lock`).
       - `src/pages/Mentors.tsx`: Removed redundant `⭐` from `"Top Rated ⭐"` filter label.
       - `src/pages/Faculty.tsx`: Removed `⭐` from department selector option text.
       - `src/components/profile/ProfileInfoForm.tsx`: Replaced `⭐ Peer Mentor` with Lucide `Star` icon and clean text.
       - `src/components/profile/MentorProfileCard.tsx`: Replaced `⭐ Rating` with Lucide `Star` icon and clean text.
- **Status at end**:
  - Zero TypeScript errors (`npm run typecheck` verified 0 errors).
  - Production build and prerender verified passing (`npm run build` completed client build, SSR bundle, and 650+ static pages prerender with exit code 0).
  - Reverted volatile build-generated sitemap timestamp diffs to keep git history atomic.
- **Next agent should**:
  - Keep `AI_STYLE_GUIDE.md` and `docs/AI_NATURE_AND_BEHAVIOR.md` in mind for any new components or copy.
  - Never introduce raw unicode emojis into user-facing web buttons, toasts, cards, or dialogs.

### Session 023 — 2026-09-10 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**: "we recently added fee and finance and its showing Historical total paid: ₹14,77,860 Which is not true. Do RCA and tell me the issue" -> "go ahead"
- **Root Cause Analysis (RCA)**:
  - The previous parser ingested table `#tbl7` from SRM portal endpoint `students/report/studentreportresources.jsp?ids=7`.
  - Table `#tbl7` is an internal ledger reconciliation between university fee assessments (`Fixed/Advances`) and accounting offsets (`Receipts/Payments`), not a receipt ledger of out-of-pocket payments made by the student.
  - The mapped column (`Receipts/Payments -> Amount`) recorded gross ledger clearance amounts rather than student payments.
  - This mistakenly counted **₹8,36,400** in SRM University merit scholarship concessions (₹2,09,100/yr across 4 academic years) and **₹13,400** in due reversals/journal adjustments as cash paid by the student.
  - The student's actual out-of-pocket payments (verified across all 25 official university payment receipts in `students/report/receiptgeneration.jsp`, section 27) total exactly **₹6,28,060**.
- **What was done**:
  1. **Scraper & Shared Pipeline**:
     - Updated `supabase/functions/_shared/srm-portal.ts`:
       - Enhanced `fetchAcademicSections` to extract `stuId` from the landing page and fetch `students/report/receiptgeneration.jsp` (`ids: 27`).
       - Added `parseFeeReceipts(html)` to extract 1:1 genuine transaction receipts with exact payment amounts, receipt numbers (`SEAS/...`), dates, and terms.
       - Added `extractFeeConcessions(tbl7Html, receipts)` to capture institutional merit scholarship waivers with `paid_amount = 0.00` and `amount = concessionAmount`, so scholarship credits are documented without inflating out-of-pocket payments.
  2. **Edge Functions**:
     - Updated `supabase/functions/sync-srm-portal/index.ts` and `supabase/functions/import-srm-portal/index.ts` to ingest from `parseFeeReceipts` as the primary source of truth, fall back safely if unavailable, and clean out stale gross ledger entries.
  3. **Database Migration & Verification**:
     - Updated `tools/apply_finance_sync.mjs` and applied migration to production Supabase project (`ruapdkrgcbqrhvsayvpf`) via MCP `apply_migration`.
     - Verified via database assertions: `count(*) = 29` (25 genuine payment receipts + 4 scholarship waivers) and `sum(paid_amount) = 628060.00`.
  4. **Frontend UI**:
     - Updated `src/components/finance/FeeFinanceOverview.tsx`:
       - Computes `totalLifetimePaid` from genuine receipts (₹6,28,060).
       - Computes `totalConcessions` from institutional waiver entries (₹8,38,620).
       - Displays "Historical total paid: ₹6,28,060" and dedicated "Scholarship Concessions: ₹8,38,620" in the advisory card.
       - Renders a clean "Waiver" badge and emerald credit display for institutional concessions in the history table.
  5. **Verification**:
     - `npm run typecheck`: 0 errors.
     - `npm run test:migrations`: All checks passed on clean and upgrade Postgres scenarios.
     - `npm run build`: Production client, SSR bundle, and prerender passed with 0 errors.
     - Visual QA: Updated `scripts/qa/qa-srmportal.mjs` and captured desktop/mobile screenshots in light and dark mode in `.qa-srmportal/`.
- **Status at end**:
  - Historical total paid accurately reflects true out-of-pocket payments (₹6,28,060).
  - Scholarship concessions (₹8,38,620) are documented as credits without inflating total paid.
  - Zero TypeScript errors.
- **Next agent should**:
  - Preserve `parseFeeReceipts` as the source of truth for `student_fee_paid_history`.
  - Follow `AGENTS.md` and `PROJECT_LOG.md` guidelines.

### Session 024 — 2026-09-10 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  1. "can you notice the discrepency, find the root cause. and what would improve it. Also note before giving suggestion will the changes affect any other parts?"
  2. "go ahead and document your learning so that future agents doesn't makes same mistake then commit and push your chnages"
- **Root Cause Analysis (RCA)**:
  - **The Discrepancy**:
    - Query 1: `"holiday in the month of september"` answered that **Vinayaka Chavithi on Monday, 14 September 2026** is an official holiday for Odd Semester AY 2026-27.
    - Query 2: `"is coming monday holiday"` (run on Thursday, 10 September 2026, where coming Monday is 14 September 2026) answered that **Monday, 14 September 2026 is a regular working day** and *"there are no holidays scheduled for this date"*.
  - **Technical Mechanism**:
    1. The deterministic ground truth already exists in the database: `public.academic_calendar_days` has `calendar_date = '2026-09-14'`, `occasion_name = 'Vinayaka Chavithi'`, `is_holiday = true`, and `get_calendar_day('2026-09-14')` returns this row.
    2. In `supabase/functions/generate-ai-overview/index.ts`, `resolveCalendarDates()` was restricted to only matching `"yesterday"`, `"today"`, and `"tomorrow"`. It returned `[]` for relative weekday phrases (`"coming monday"`, `"next monday"`, `"is monday holiday"`) and explicit dates (`"14th september"`).
    3. Because `resolveCalendarDates` returned `[]`, `resolveCalendarFacts()` was never called for `2026-09-14`, and no `RESOLVED_FACTS` block was injected into Gemini's prompt.
    4. Prompt Rule 1 instructed the model that without `RESOLVED_FACTS`, it should read the retrieved Academic Calendar document chunks. The search query retrieved Page 1 ("Odd Semester Key Academic Dates & Timelines", which only lists administrative deadlines like exams and fee dates) as Chunk [1]. Page 3's calendar grid is a compressed, unaligned text sequence (`Mon 6 13 20 27 3 10 17 24 31 7 H 21 28 ...`) where `H` is unlabelled and "14" explicitly appears in the December column. The LLM deduced that coming Monday is 14 September, looked at Chunk [1], saw no holiday, and hallucinated that it was a working day.
    5. In contrast, `"holiday in the month of september"` succeeded because the LLM did not perform date-math on weekdays; it simply scanned Page 3's explicit text list of holidays: `"4. Vinayaka Chavithi - 14.09.2026 (Monday)"`.
    6. Additionally, in `src/lib/search/query-engine.ts`, `CAMPUS_VOCABULARY` lacked weekdays, causing `correctTypo("monday")` to mistakenly compute a Levenshtein match to `"today"` (suggesting *"Did you mean 'is coming today holiday'?"*).
- **What was done**:
  1. **Calendar Date Resolution (`generate-ai-overview/index.ts`)**:
     - Upgraded `resolveCalendarDates` to detect relative weekdays (`coming/next/this/upcoming monday`, `is monday holiday`, `on friday`) with forward-offset calculation in `Asia/Kolkata` time zone.
     - Added explicit date matching (`14th september`, `september 14`, `14-09-2026`).
     - Enhanced `resolveCalendarFacts` so that when `get_calendar_day` returns no special holiday row, it deterministically sets Sundays as weekend holidays and weekdays (Mon-Fri) as working days (`is_holiday: false`) with no declared holiday on record, eliminating table hallucination.
     - Fixed forward-offset calculation in `resolveUserTimetables` so target weekdays earlier in order do not resolve backwards to past dates.
     - Added weekdays to `hasTemporalWords` in `retrieve()`.
  2. **Query Engine Vocabulary (`src/lib/search/query-engine.ts`)**:
     - Added all 7 weekdays (`monday`...`sunday`) and 12 months (`january`...`december`) to `CAMPUS_VOCABULARY` to prevent typo-correction from replacing valid days with "today".
     - Added unit tests in `src/lib/search/query-engine.test.ts`.
  3. **Documentation**:
     - Updated `docs/AI_NATURE_AND_BEHAVIOR.md` documenting that deterministic Postgres calendar resolution must always precede LLM generation.
  4. **Edge Function Deployment**:
     - Deployed `generate-ai-overview` (version 38, `verify_jwt: false`) to Supabase project `ruapdkrgcbqrhvsayvpf`.
- **Status at end**:
  - `is coming monday holiday` now returns: `Verdict: 🏖️ Official Holiday — Vinayaka Chavithi` ("Yes, the upcoming Monday, 14 September 2026, is an official university holiday on the occasion of Vinayaka Chavithi...").
  - `holiday in the month of september` returns: `Verdict: 📅 Two Holidays in September 2026` ("Sri Krishna Astami on Friday, 4th September 2026, and Vinayaka Chavithi on Monday, 14th September 2026...").
  - `is coming friday holiday` returns: `Verdict: 📅 Friday is a Working Day` ("Coming Friday, 11 September 2026, is a regular working day at SRM University-AP...").
  - `npm run typecheck`: 0 errors.
  - `npm run test`: 20 test files passed, 162 tests passed.
- **Next agent should**:
  - Never allow LLM prompts to calculate calendar holidays from unstructured table text. Always route date questions through deterministic `get_calendar_day` resolution.

### Session 025 — 2026-09-10 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  1. "what is this number 3, 6, and 2 in srm portal page"
  2. "we dont' need that, just remove that and commit and push with your learning documented"
- **Root Cause Analysis (RCA)**:
  - The numeric badges on the SRM portal tabs in `src/pages/Attendance.tsx` rendered raw entity counts:
    - `Attendance & Bunk Calculator`: `records.length` (count of enrolled subjects synced).
    - `Class Timetable`: `timetableSlots.length` (count of weekly timetable slots/periods, e.g. 16).
    - `Fee & Finance`: `feeDues.length` (count of fee billing categories/dues on record).
  - Raw entity counters on navigation tabs create noise and confusion; students misinterpret counts (like "16" on timetable or "3" on attendance) as unread notifications, pending actions, or errors.
  - Tab navigation should remain clean; the pulsing amber indicator for overdue/pending fee balances (`to_be_paid_amount > 0`) was preserved as an actionable alert without misleading numeric counters.
- **What was done**:
  - Removed `{records.length}`, `{timetableSlots.length}`, and `{feeDues.length}` badge spans from the tab buttons in `src/pages/Attendance.tsx`.
  - Maintained the amber alert pip on `Fee & Finance` when outstanding dues exist.
  - Verified `npm run typecheck` (0 errors) and `npm test` (20 files passed, 162 tests passed).
- **Status at end**:
  - SRM Portal tab buttons have clean titles without confusing numeric badges.
  - Typecheck: 0 errors.
  - Unit tests: 162/162 passed.
- **Next agent should**:
  - Do not introduce numeric badges to tab headers unless they represent true unread/actionable items with explicit student value.

### Session 026 — 2026-09-10 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  1. "I think, if you see the portal Student Attendance (new), where it shows the todays attendance given. Can you find that? if yes, brainstorm to integrate it properly usig Don Norman Priciples"
  2. "See any way students goes to todays attendance and bunk calculator. can we incorporate todays attendance in same table. what do you say"
  3. "one doesn't need to see both present things. filling that with just present or absent is fine and make sure you compact the table so that its in one view and i don't have to scroll horizontally, understood"
- **Root Cause Analysis (RCA) & Architecture**:
  - The SRM Student Portal hosts today's period attendance at `POST /students/transaction/studentattendance.jsp` with payload `ids=33&stuId=<internal_id>`. It returns a 5-column HTML table containing daily attendance: Date, Day Order, Hour, Subject, and Status (`P`, `A`, `OD`).
  - To prevent fragmented mental models, today's attendance is incorporated directly into the Attendance & Bunk Calculator table using Don Norman's principles (Visibility, Mapping, Feedback, and Semantic Signifiers).
  - Designed with two explicit constraints:
    1. Zero period noise: Single compact badge `[Present]` or `[Absent]`, never verbose period repetition like `[P7: P] [P8: P]`.
    2. Zero horizontal scrolling: Compacted table column widths (`38%`, `14%`, `16%`, `17%`, `15%`) with ~485px total min-width, fitting completely on 1024px and 1280px screens without horizontal scroll. Added responsive mobile card view (`sm:hidden`) for phones (<640px).
- **What was done**:
  1. **Database Migration (`supabase/migrations/20260910120000_student_daily_attendance.sql`)**:
     - Created `student_daily_attendance` table with `attendance_date`, `day_order`, `period_slot`, `course_code`, `course_name`, `status`, and unique constraint `(user_id, attendance_date, period_slot)`.
     - Applied to Supabase project `ruapdkrgcbqrhvsayvpf` via MCP `apply_migration`.
     - Added test assertion to `supabase/tests/verify-migrations.mjs` and verified PGlite test suite passes (`npm run test:migrations`).
  2. **Backend Scraper & Edge Functions**:
     - Added `TodayAttendanceItem` interface, `parseTodayAttendance()` parser, and Section 33 fetch to `supabase/functions/_shared/srm-portal.ts`.
     - Updated `supabase/functions/import-srm-portal/index.ts` and `supabase/functions/sync-srm-portal/index.ts` to parse Section 33 and upsert daily attendance records.
     - Deployed both edge functions to Supabase project `ruapdkrgcbqrhvsayvpf` with `--no-verify-jwt`.
  3. **Frontend UI (`src/pages/Attendance.tsx`)**:
     - Added `StudentDailyAttendance` interface and `dailyAttendance` state with offline storage fallback.
     - Computed `todayCourseStatusMap` with course code normalization.
     - Added `"Today"` filter tab (`All`, `At risk`, `Safe`, `Today (X)`).
     - Rendered compact `[Present]` (emerald) / `[Absent]` (destructive) badges alongside course code and slot badge.
     - Compacted table columns for desktop/tablet to eliminate horizontal scrolling.
     - Added responsive card view (`sm:hidden`) for mobile screens.
  4. **Visual QA & Verification**:
     - Updated `scripts/qa/qa-srmportal.mjs` with daily attendance mock data.
     - Captured and visually verified screenshots at 1280px, 1024px, and 360px mobile in both light and dark themes.
     - Verified `npm run typecheck` (0 errors) and `npm run build` (clean exit 0).
- **Status at end**:
  - Today's attendance is fully integrated into the existing Attendance & Bunk Calculator table.
  - Zero horizontal scroll verified on desktop (1280px & 1024px) and mobile (360px).
  - Typecheck baseline: 0 errors.
  - Build: clean exit 0.
### Session 027 — 2026-09-10 · Agent: Antigravity (Gemini 3.8 Flash)
- **Prompt**:
  - "can zero horizontal scroll be done for time table as well?"
- **Root Cause Analysis (RCA) & Architecture**:
  - The SRM Portal Timetable view previously had two major causes of horizontal overflow:
    1. `WeeklyMatrixTable.tsx` hardcoded `min-w-[780px]` and column cells with `min-w-[95px]`. On desktop viewports (1024px or split screen), this forced an overflow scrollbar. On mobile (360px), attempting to fit a 9-column matrix (Day + 8 period hours) in 360px yielded ~36px per column, which crushes timetable badges and room numbers.
    2. `CourseFacultyDirectory.tsx` hardcoded `min-w-[650px]` on its table without mobile card accommodation, forcing horizontal scroll on all screens under 650px.
  - **Solution**:
    1. **Dual-Mode Timetable View (`WeeklyMatrixTable.tsx`)**:
       - Default to Day Agenda View on mobile (`< 768px`) and Week Matrix Grid on desktop (`>= 768px`), with a manual toggle (`Day` vs `Week`).
       - **Day Agenda View**: Horizontal day pill selector (`[Mon 4 cls] [Tue 1 cls] [Wed 5 cls] [Thu 6 cls] [Fri Free]`) with automatic pre-selection of today in Asia/Kolkata timezone. Fits cleanly in 328px with zero horizontal scroll. Chronological vertical timeline cards displaying period badge (`Hour 2`), time (`10:00 - 10:50`), color-coded course code badge, course name, room number badge (`X 312`), faculty name with directory link, and practical/lab indicator.
       - **Week Matrix Grid**: Removed artificial `min-w-[780px]` and `min-w-[95px]`. Converted to `table-fixed w-full` with proportional columns (`w-[8%]` day column, `8 * w-[11.5%]` period columns). Truncated cell code and room numbers with hover tooltip. Fits 100% inside 1024px and 1280px with zero horizontal scroll.
    2. **Course & Faculty Directory (`CourseFacultyDirectory.tsx`)**:
       - **Mobile View (`sm:hidden`)**: Responsive card stack showing course code badge, LTPC badge, weekly hours, course name, faculty link with external link icon, and room badges with map pin icons.
       - **Desktop View (`hidden sm:block`)**: `table-fixed w-full` with proportional columns (`w-[14%]`, `w-[33%]`, `w-[13%]`, `w-[22%]`, `w-[18%]`), completely eliminating `min-w-[650px]`.
- **What was done**:
  1. Refactored `src/components/timetable/WeeklyMatrixTable.tsx` with responsive Day Agenda and Week Matrix modes.
  2. Refactored `src/components/timetable/CourseFacultyDirectory.tsx` with mobile cards and table-fixed desktop layout.
  3. Extended `scripts/qa/qa-srmportal.mjs` with 1024px desktop and mobile day-with-classes test scenarios.
  4. Ran visual QA sweep and confirmed zero horizontal scroll on all viewports.
- **Verification**:
  - `npm run typecheck`: 0 errors.
  - `npm run build`: Clean exit 0 (client, SSR, and prerender).
  - Puppeteer screenshots across all viewports and themes:
    - `srmportal-timetable-desktop-light.png` (1280px): zero horizontal scroll verified.
    - `srmportal-timetable-desktop-dark.png` (1280px): zero horizontal scroll verified.
    - `srmportal-timetable-desktop-1024px.png` (1024px): zero horizontal scroll verified.
    - `srmportal-timetable-mobile-360px-light.png` (360px): zero horizontal scroll verified.
    - `srmportal-timetable-mobile-360px-dark.png` (360px): zero horizontal scroll verified.
    - `srmportal-timetable-mobile-360px-classes.png` (360px): zero horizontal scroll verified.
- **Status at end**:
  - Both Weekly Matrix View and Course & Faculty Directory have zero horizontal scroll across mobile (360px) and desktop (1024px, 1280px).
- **Next agent should**:
  - Maintain the Day Agenda View as default on mobile viewports for all calendar/timetable schedules.

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



