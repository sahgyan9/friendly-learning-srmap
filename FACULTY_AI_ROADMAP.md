# Faculty discovery & the campus assistant — plan of record

Agreed 2026-08-06. This is the working plan for making faculty findable by
*what they work on*, and for the AI layer that sits on top of it. It exists so
the reasoning survives between sessions — several decisions here are deliberate
rejections of the obvious approach, and without the "why" they look arbitrary.

**The goal in one sentence:** a student asks "I'm building X, who can help?" and
gets back faculty *and* senior mentors in a single answer. No general search
engine, course catalogue, or WhatsApp group can do that, because it needs both
halves of the campus in one graph.

---

## Phase 1 — Research interests · SHIPPED

Live in production as of 2026-08-06. Migration
`20260806100000_faculty_research_interests.sql`, plus changes to
`supabase/functions/sync-faculty/index.ts` and the faculty UI.

The directory previously stored a professor's name and department and nothing
about their work, so "who could supervise this?" had nothing to match on.

**The data was already arriving and being discarded.** SRM AP's WordPress
directory attaches an `interest` taxonomy to **589 of 627** active profiles
(94%), median 3 terms each, ~1380 distinct terms; plus a sparser
`department-research-area` on 74. Both already travelled in the REST response
`sync-faculty` pulls monthly.

What shipped:

- `faculty.interests` and `faculty.research_areas` (`text[]`), plus
  `faculty.interests_text` — a flattened `"A | B | C"` copy used for search.
- `get_faculty_interest_facets()` — the ~206 interests shared by 2+ people.
- Interest chips on cards and profiles, a "Browse by research interest" row, and
  free-text search that now looks inside interests.

### Decisions worth not re-litigating

- **`interests_text` is trigger-maintained, not a generated column.**
  `array_to_string` is `STABLE`, not `IMMUTABLE`, and Postgres rejects stored
  generated columns built on non-immutable expressions. It fails at migration
  time, not later.
- **Separator is `' | '`, not a space** — otherwise a search for
  `"intelligence 2d"` matches across the boundary between two unrelated
  interests. There is a test for exactly this.
- **No trigram index.** ~627 rows; a sequential ILIKE scan is sub-millisecond,
  and `pg_trgm` would add a schema-placement problem. Same call the original
  faculty migration made.
- **The terms are messy free text and that is fine.** "IoT" (32) and "Internet
  of Things" (12) are separate terms because professors typed them differently.
  Not worth hand-cleaning — Phase 3's semantic search collapses them for free.
  This is why they are matching material, not a filter dropdown.

---

## Phase 2 — Course → faculty mapping · NEXT

Which faculty teach which courses.

**Do not block on administration supplying the official list.** Students already
enter `course_code` when they leave a faculty rating, so a who-teaches-what map
is derivable from data already being collected, with the row count doubling as a
confidence score. Build that first; add an admin-authored override table that
wins wherever it has data. If the official list ever arrives it slots in; if it
never does, there is still a working feature.

---

## Phase 3 — Topic search across faculty *and* mentors

Retrieval over the interests from Phase 1 and the courses from Phase 2.

**Do not copy the approach in `supabase/functions/ai-chatbot/index.ts`.** It
stuffs the entire mentor list into a Gemini prompt and asks for IDs back. At
~600 faculty plus interests plus reviews that prompt explodes, costs money per
query, is slow, and the model will invent IDs that do not exist.

The shape to build instead is **retrieve, then explain**:

1. Embed each entity once, on the existing monthly schedule.
2. Embed the query once; the match is a plain vector search in Postgres. Fast,
   cheap, and structurally incapable of returning a person who is not there.
3. The LLM writes only the final "these three match because…", constrained to
   the tags actually on file.

**Blocked on:** pgvector must be enabled on the production project. Not yet
confirmed as allowed.

---

## Phase 4 — Wire retrieval into the assistant

Same retrieval layer, exposed to `ai-chatbot` as a lookup step rather than
prompt-stuffing.

---

## Phase 5 — Faculty availability · DEFERRED ON PURPOSE

Not "not yet got to it" — deliberately held back. Faculty are not users of this
app and will not maintain office hours in it. **Stale availability is worse than
none:** a fresher walks to a cabin at the time the site promised, finds it
empty, and blames the platform. The softer version that captures most of the
value already half exists — the `helpfulness` score and the "Helpful in office
hours" tag are student-verified and self-correcting.

---

## The AI layer: retrieval, not training

Asked directly whether the platform's data could be used to *train* an LLM for
the university. **The answer is no, and this is settled.**

Fine-tuning teaches a model style and behaviour, not facts. The facts here change
constantly — new faculty, new ratings, new opportunities — and a trained model
freezes a snapshot, then states outdated things confidently *about named real
employees of a university*. That is the one failure mode this product cannot
afford.

"LLM-ready schema" therefore means a **retrieval layer**, not a training corpus:
a single derived table every entity projects into.

```
knowledge_chunks
  entity_type   'faculty' | 'mentor' | 'course' | 'opportunity' | 'community_post'
  entity_id     -> the source row
  title         'Dr X — CSE'
  body          the searchable text
  metadata      jsonb: department, tags, dates, skills
  visibility    'public' | 'signed_in' | 'members_only'
  embedding     vector
  source_url    for citation
```

Three rules:

1. **Derived, never authoritative.** Source tables stay the truth; chunks are
   rebuildable from scratch at any time.
2. **`visibility` is filtered in SQL, before the model sees anything.** This is
   the primary way RAG systems leak data. Reviewer identity must never enter a
   chunk at all — faculty reviews are anonymous by construction and there is no
   path, including through the assistant, that may expose who wrote what.
3. **Each new feature writes a small projector, not a new AI integration.**
   Shipping Opportunities should teach the assistant about hackathons for ~30
   lines, not a re-architecture.

The corpus is the moat; the model is a commodity.

---

## Opportunities page — planned, not started

Hackathons and competitions, with team formation. Discovery → register interest
→ post what you need → team forms → group chat.

Strongest growth loop available: it recurs weekly, it carries deadlines, and a
student who needs a teammate *has* to invite others, so recruiting is the
product. Reuses groups, group chat, notifications and profiles — mostly
assembly.

**Scope warning:** registration stays with the official organiser. Devfolio,
Unstop and MLH own their signup flows and cannot be proxied. Own discovery and
team formation — the part that is actually unsolved — and link out for the rest.

---

## Recommendations ("just suggest someone for me")

A distinct mode from search, and easy to lose inside Phase 3. Search answers a
query the student typed; **recommendation answers a student who does not know
what to ask** — the more common case for a fresher.

Same retrieval layer, different input: instead of embedding a typed query, embed
what is already known about the student (department, year, courses they have
rated, communities joined, opportunities they showed interest in) and return
nearest faculty + mentors. Ship it after Phase 3, on the homepage and after
onboarding. It needs no new infrastructure — only a different thing to embed.

---

## Pitch deck

Built 2026-08-06, one page with a toggle between the two audiences:
**https://claude.ai/code/artifact/b4aed0cb-3936-47f4-8920-213caeb9d8a9**

Regenerate rather than rewrite: it is a single self-contained HTML file, styled
from the real brand tokens in `brand_assets/BRAND_GUIDELINES.md` (`#3963C6`, the
navy, the system font stack), with a Print/PDF button that paginates one slide
per page.

### The finding that shaped it — do not quietly discard this

Live database counts on the day it was built: **27 registered accounts, 4
verified mentors, 2 faculty ratings, 2 communities, 10 messages, 624 faculty.**

That means **there is no investor deck yet — there is a Dean deck.** The product
is genuinely built (auth, roles, RLS, realtime chat, moderation, certificates,
transactional email, SEO all done); the distribution has never started. Any
investor who spends thirty seconds on diligence finds the same numbers, so a
deck implying traction ends that conversation permanently.

The credible order is: **Dean first → orientation access → onboard an intake →
measure mentor reply rates over a semester → then the investor deck writes itself
with numbers that need no hedging.**

Consequences baked into the deck, worth preserving on any edit:

- Slide 5 states the real numbers plainly rather than hiding them.
- Unverifiable figures (raise amount, runway, enrolment, intake size) are amber
  `fill` markers, never invented. **Do not replace them with plausible guesses.**
- The institution track leads with the ask (orientation slot, course-faculty
  mapping, a named contact, permission to continue) and pre-empts the six
  questions a Dean actually raises — faculty defamation, affiliation, data
  provenance, takedown, student data, what happens at graduation.
- The safety/governance slide sits early and blunt, because faculty ratings are
  the thing an administrator reacts to first.
- Non-affiliation is stated on the cover, in the FAQ, and in the footer.

**Numbers must be re-pulled before any external use** — they are live counts, not
a fixed claim, and they will be wrong within weeks.

---

## Answered 2026-08-06 — and what changed as a result

**1. Is there a line to administration? → No.** Not aspirational-but-likely;
there is no contact. The Dean deck is the mechanism for *creating* that line, not
evidence one exists.

**2. Public or signed-in? → Public.** Chosen for reach: topic pages can rank in
search, which is free distribution the project badly needs. Two guardrails are
therefore not optional:

- Rank by **topical fit, never by rating.** Ratings may be displayed as
  information; they must not order a list of named faculty.
- The assistant explains a match using **only the interest tags on file**. It
  never writes free prose about a named professor. These are real employees of a
  real university and the page is publicly indexable.

`visibility` on `knowledge_chunks` still matters despite public faculty search —
private communities, group messages and DMs pass through the same retrieval
layer later.

**3. pgvector? → Yes, when Phase 3 starts.** Confirmed available on the project
(`vector` 0.8.0, not yet enabled). First-party, free, one line, touches no
existing table, reversible. Enable it as step one of Phase 3, not before.

---

## Sequencing correction — Phase 3 should come before Phase 2

The original order put courses before search. With no administration contact,
that is wrong, and the reason is worth stating plainly:

**Phase 2 needs users. Phase 3 does not.**

Phase 2 derives the course map from `course_code` on faculty ratings. There were
**2 ratings** in the database when this was written, so the derived map would
have ~2 entries. It is not blocked on administration — it is blocked on having a
student body. Even with an admin override table, there is no admin to ask.

Phase 3 runs on the interest data **the university already supplied**: 589
professors, no student contribution required, working the day it ships. It also
delivers the original request — *"I have a project on X, who can help?"* —
directly.

**Revised order: 1 → 3 → 4 → 2 → Opportunities**, with the caveat that
Opportunities may deserve to jump ahead of everything, since it is the growth
loop and the whole plan is gated on having students at all.

### When Phase 2 does come

Decouple contributing a course from leaving a review. A full rating is a large
ask for a fresher; *"Did they teach you? Which course?"* is one tap, and it is
the only mechanism likely to populate the map without administration. Keep the
admin override table in the design — it costs nothing and slots in if a contact
ever materialises.

---

## Positioning note

There is an investor/institution pitch deck built from this plan. It uses **live
database counts, not projections** — re-pull them before any external use, and
do not let placeholder market figures creep in. The binding constraint from
`brand_assets/BRAND_GUIDELINES.md` §4 applies to every external surface:
**never claim university affiliation.** SRM University-AP is a location in copy,
never an issuer or endorser.
