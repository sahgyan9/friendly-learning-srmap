# AI Nature, Architecture, and Behavior in Friendly Learning SRMAP

This document serves as the comprehensive architectural and behavioral guide for all AI agents, engineers, and contributors working on Friendly Learning SRMAP. It explains the threefold meaning of "AI-ish nature" in this workspace:
1. **The Production AI Architecture (CampusBrain & Edge AI Services)** — how AI is legitimately designed and used as a production subsystem.
2. **The Codebase's AI Lineage** — the history of how this project was originally scaffolded by AI and evolved over 18 months.
3. **The "AI-ish" Anti-Patterns ("AI Slop")** — the specific habits, stylistic tropes, and engineering code smells that must be rigorously prevented.

---

## 1. Executive Summary: The Three Dimensions of "AI-ish Nature"

When discussing the "AI-ish nature" of this workspace, there are three distinct facets:

1. **The Legitimate AI Features**: A multi-entity Retrieval-Augmented Generation (RAG) and semantic vector search system (CampusBrain) powered by Supabase Postgres (`pgvector`), Google Gemini embeddings (`gemini-embedding-001`, 768-dim), and Gemini generation models (`gemini-flash-latest`), governed by strict anti-hallucination and privacy guardrails.
2. **The Historical AI Origins**: The codebase began on March 1, 2025 as an AI-scaffolded MVP on **Lovable.dev (formerly GPT-Engineer)**. Over one-third of the repository's git commits (455 commits) were authored by `gpt-engineer-app[bot]` before maturing into disciplined agentic pair programming with Claude Code and Antigravity (Gemini 3.8 Flash).
3. **The Unwanted "AI-ish" Behavior ("AI Slop")**: The user-defined and industry-recognized term for low-effort, surface-level patterns characteristic of unchecked LLM generation: decorative emoji clutter (`⚡`, `💡`, `✨`, `🚀`), performative cheerleading (*"I'd be thrilled to help!"*), corporate buzzwords (*"seamlessly"*, *"delve"*, *"tapestry"*), "HTTP 200 false success" (declaring success without checking database rows), and hardcoded cosmetic mockup badges.

---

## 2. The Production AI Engine (CampusBrain & Edge AI Services)

The platform implements an AI subsystem built around the core principle: **"Retrieve, then explain — the database is the source of truth, the model is a summarizer."**

### A. Semantic Vector Search & Knowledge Base (`knowledge_chunks`)
- **Authority**: [`FACULTY_AI_ROADMAP.md`](../FACULTY_AI_ROADMAP.md), [`SEARCH_GUIDE.md`](../SEARCH_GUIDE.md).
- **Database Schema**: A single derived vector table `public.knowledge_chunks` indexed with `pgvector` cosine distance (`<=>`).
- **Embedding Model**: Google Gemini `gemini-embedding-001` configured to `outputDimensionality: 768` (renormalized unit vector) and `taskType: RETRIEVAL_DOCUMENT` (for indexing) vs. `RETRIEVAL_QUERY` (for searches).
- **Multi-Entity Projections**: Eight distinct platform entity types project derived searchable chunks into `knowledge_chunks`:
  1. `faculty` (627 professors with research interests and departments)
  2. `mentor` (senior student mentors with skills and bio)
  3. `opportunity` (hackathons, competitions, internships)
  4. `community` (student workspace groups and clubs)
  5. `post` (public community discussion board posts)
  6. `student` (opt-in peer discovery profiles, gated strictly to `visibility = 'signed_in'`)
  7. `campus_documents` (administrative policies, CFAO, ITKM, wellness center info)
  8. `knowledge_articles` (admin-authored reference articles via Tiptap editor)
- **Automated Reprojection Pipeline**:
  - Small tables (opportunities) reproject on statement triggers.
  - Large tables (posts, users) reproject per-row on update of relevant fields.
  - `pg_cron` runs an hourly rebuild and a 10-minute top-up job calling `embed-knowledge`.
  - Edge caching via `search_query_cache` prevents rapid typing from exhausting the 100 requests/min free-tier embedding quota.

### B. AI Overviews (`generate-ai-overview`)
- **Location**: `supabase/functions/generate-ai-overview/index.ts`.
- **Purpose**: Generates Google-style contextual AI search summaries on `/search` and `/ask`.
- **Pre-LLM Deterministic Resolvers**: Before invoking any LLM, the function queries deterministic database state:
  - `resolveCalendarFacts()`: Calls `get_calendar_day` RPC to verify whether a queried date (today, tomorrow, yesterday, relative weekdays like "coming monday", or explicit dates like "14th september") is an official university holiday or working day. **Deterministic Postgres lookup must always precede LLM generation**: models must never be asked to interpret compressed multi-column working days grids or compute date offsets on their own.
  - `resolveUserTimetables()`: Resolves live class schedules directly from `student_timetables` with forward-offset weekday matching.
  - `resolveUserEventSchedules()`: Fetches RSVP'd campus events.
  - `resolveMentorPresence()`: Checks live class/event availability.
- **Failover & Key Pooling**: Uses `_shared/gemini-pool.ts` to manage multiple Gemini API keys, automatically marking keys on cooldown when encountering HTTP 429 rate limits.

### C. Campus Assistant Chatbot (`ai-chatbot` & `ChatbotModal`)
- **Location**: `supabase/functions/ai-chatbot/index.ts`, `src/components/chatbot/`.
- **Architecture**:
  - Replaced legacy prompt-stuffing with grounded RAG: queries `semantic-search`, extracts relevant chunks, and injects only retrieved cards.
  - Canned FAQs (`CANNED_FAQ`) handle deterministic common questions instantly with zero token consumption.
  - Contextual awareness (`PAGE_CONTEXT`) detects which route the user is currently browsing.
- **Product Red Lines (Non-Negotiable)**:
  1. **Faculty Review Anonymity**: Reviewer identities never reach search chunks, prompts, or model outputs.
  2. **No Ranking by Rating**: Faculty are ranked solely by topical fit; the model is forbidden from making quality judgments or ranking professors by ratings.
  3. **Anti-Hallucination on Admin Facts**: For administrative queries (fees, WiFi, offices, condonation), the model is instructed to cite only retrieved records and verbatim URLs. If no record is found, it must state that the information is not on file rather than guessing.
  4. **Non-Affiliation**: The platform must never claim official SRM University-AP affiliation or endorsement.

### D. Multi-Modal Document & Profile AI Functions
- **`generate-mentor-summary`**: Automatically generates punchy taglines, outcomes, and AMA topics from a mentor's own bio and skills. Enforces a strict material threshold (does not invent text if the mentor provided insufficient bio).
- **`parse-notice`**: Multimodal Gemini vision pipeline that transcribes administrative circulars (images/PDFs) into structured JSON (title, reference number, effective date, category).
- **`parse-linkedin-pdf`**: Extracts work experience, skills, and projects from student-uploaded LinkedIn PDF resumes.
- **`parse-doc-ocr`**: OCR processing for campus policy documents.

---

## 3. The Codebase's AI Lineage (Lovable to Agentic Development)

Understanding the codebase requires understanding its provenance:

1. **Phase 0 — Genesis on Lovable (March 2025)**:
   - Initial commit `1956692` created by `gpt-engineer-app[bot]` via Lovable.dev using the `vite_react_shadcn_ts` template.
   - Over 455 commits were authored directly by Lovable bots (`gpt-engineer-app[bot]`).
   - Residual artifacts still present in the repository:
     - `public/lovable-uploads/` (original uploaded images and logos).
     - Domain bounce scripts in `index.html` redirecting `*.lovable.app` to the production domain.
     - `LOVABLE_API_KEY` configuration in edge function environments.
2. **Phase 3 — Shift to Disciplined Agentic Engineering (July 2026)**:
   - Transitioned from raw prompt-and-pray generation to disciplined Conventional Commits and staff-level agentic workflows with Claude Code (`Claude Sonnet 5`, `Claude Fable 5`).
   - Established `FABLE_BUILD_PLAN.md` and `FACULTY_AI_ROADMAP.md` as permanent authorities.
3. **Phase 4 & Present — Antigravity & WAT Architecture (September 2026)**:
   - Current operations follow the WAT architecture (Workflows, Agents, Tools).
   - Mandatory tracking via `PROJECT_LOG.md` and anti-slop compliance via `AI_STYLE_GUIDE.md`.

---

## 4. What is "AI-ish Behavior" / "AI Slop"? (The Negative Definition)

In this workspace, "AI-ish behavior" is the derogatory term for careless, surface-level, unverified outputs generated by conversational LLMs. It manifests in three areas:

### A. UI Design and Copy Slop
| Anti-Pattern | Description | Examples to Avoid | Approved Standard |
| :--- | :--- | :--- | :--- |
| **Emoji Clutter** | Sprinkling emojis across UI components to simulate "friendliness" or "modernity". | `⚡ Sync Now!`, `✨ All Recommendations`, `🚀 Start Projects`, `💡 Quick Ideas` | Neutral button labels, semantic SVG icons (`Lucide` icons only). |
| **Lexical AI Clichés** | Overusing predictable filler words favored by RLHF-tuned models. | *"delve"*, *"tapestry"*, *"landscape"*, *"seamlessly"*, *"game-changer"*, *"robust"*, *"empower"*, *"plethora"* | Clear, direct, functional English explaining concrete actions. |
| **Performative Sycophancy** | Chatbot or agent greetings filled with artificial enthusiasm. | *"I'd be thrilled to help you with that!"*, *"Awesome question! Let's dive in!"* | Direct, helpful response: *"Here are the class schedules for today."* |
| **Cosmetic Mockup Pills** | Inserting hardcoded badges or fake metadata to make a UI look populated. | Hardcoding `2-0-2-4 (Lab)` pills or static color classes on dynamic rows. | Deriving exact values from database columns (`ltpc`, `course_code`). |

### B. Engineering and Code Smells
1. **The "HTTP 200 Fallacy" (Confident False Success)**:
   - Claiming an integration or migration succeeded because no network exception was thrown, without querying the database.
   - *Real project example*: In early iterations of `sync-faculty`, 627 faculty rows were reported as "synced", but 0 columns were populated. Always run `SELECT count(*)` and check populated fields before declaring success.
2. **Docstring & Comment Overdose**:
   - Writing verbose comments explaining self-evident code (e.g., `// Set name to user's name\nconst name = user.name;`) while omitting architectural context, edge cases, and root causes.
3. **Asymmetry of Effort / Shallow Patches**:
   - Applying a quick visual regex or wrapper that masks a symptom while leaving the root cause unaddressed.
   - *Real project example*: Mismatching timetable periods between Section 5 and Section 10 on the SRM portal; patching the UI with static fallback hours rather than fixing the portal scraper's section ID.
4. **Hallucinated Methods and Configs**:
   - Calling non-existent APIs or passing invalid arguments (e.g. attempting `thinkingConfig: { thinkingBudget: 0 }` on `gemini-flash-latest`, which returned 400). Always verify model capabilities empirically.

---

## 5. Audit of Residual AI-ish Slop in the Codebase

While major subsystems follow disciplined engineering, several legacy UI surfaces still contain residual AI slop that should be cleaned up during relevant feature work:

1. **`src/components/workspace-groups/CommunityOnboardingHero.tsx`**:
   - `label: "✨ All Recommendations"` → Replace with `"All Recommendations"`.
   - `label: "⚡ Hackathons & SIH"` → Replace with `"Hackathons & SIH"`.
   - `label: "💻 Tech & Dev Projects"` → Replace with `"Tech & Dev Projects"`.
2. **`src/pages/ProfileSetupStudio.tsx`**:
   - Lines 548–595: Toasts using `✨` and `💡` (`toast.success("✨ AI summary drafts generated...")`). Replace with clean text notifications.
   - Line 1484: `💡 Quick Ideas:` in setup guidance.
3. **`src/hooks/usePushNotifications.ts`**:
   - Line 100: `body: "Test notification: Web Push is working seamlessly on this device! 🚀"` → AI cliché ("seamlessly") and rocket emoji. Replace with `"Test notification: Web Push notifications are active on this device."`.
4. **`src/pages/About.tsx` & `src/pages/HowItWorks.tsx`**:
   - Line 172 of `About.tsx`: `<div className="text-3xl mb-3">🚀</div>`.
   - Line 88 of `HowItWorks.tsx`: `<h4 className="font-bold mb-2">🚀 Start Projects</h4>`.
5. **Form Callout Icons (`SignIn.tsx`, `BecomeMentor.tsx`, `RejectedApplicationNotice.tsx`)**:
   - Raw `💡` emojis used in info callouts. Replace with Lucide `<Info className="h-4 w-4 text-blue-500" />` or `<AlertCircle />`.

---

## 6. Protocols for Future AI Agents

Every AI agent working in this repository MUST abide by these five rules:

1. **Read `PROJECT_LOG.md` Before Acting**: Learn the history, recent RCA, and avoid repeating known failures.
2. **Empirical Verification Over Assumptions**: Never announce a task is done without verifying the data. Query Postgres tables, run `npm run typecheck`, and run test harnesses.
3. **Strict Zero-Emoji Policy in UI and System Messages**: All buttons, badges, notifications, and toasts must use Lucide SVG icons and concise text.
4. **Direct Senior Engineering Communication**: No sycophancy, no cheerleading, no filler words. Provide the root cause, the fix, and the verification.
5. **Append to `PROJECT_LOG.md` at Turn Completion**: Record the exact prompt, root cause analysis, files modified, verification commands, and handoff instructions.
