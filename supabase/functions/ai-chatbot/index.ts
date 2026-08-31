// Campus assistant: answers grounded in the platform's own records.
//
// REWRITTEN 2026-08-06 to retrieve before it answers. What it replaced, and why:
//
//   The previous version fetched mentors with `.limit(10)`, pasted all of them
//   into a Gemini prompt, and asked the model to reply with the IDs it liked.
//   Three problems. It could only ever see ten mentors, so "search all mentors"
//   was never true and would have silently degraded as the platform grew. It
//   asked a language model to act as a database, which means it can return an
//   ID that does not exist. And faculty were absent entirely — 627 professors
//   the assistant could not mention.
//
// Now: retrieve, then explain. semantic-search does a vector lookup over
// knowledge_chunks and returns real rows; the model only writes prose about
// what was retrieved. It cannot invent a professor, because it is never asked
// to choose one.
//
// The retrieval hop goes through semantic-search rather than reimplementing
// embedding here, so there is one definition of "what matches this question"
// and both paths share the query cache — which is what keeps a chatty student
// from exhausting the embedding quota.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";

/**
 * Two keys, tried in order — a second free-tier project's quota, not a
 * different account's data. Primary absorbs all traffic until it starts
 * hitting 429s; the second only gets used as overflow once the first is
 * genuinely exhausted, rather than splitting requests 50/50 up front, which
 * would waste headroom on whichever key isn't actually under pressure yet.
 * Embeddings deliberately keep using only the primary key — embed-knowledge
 * and semantic-search's embedQuery are unaffected by this list.
 */
import {
  getPrioritizedGeminiKeys,
  markGeminiKeyCooldown,
  markGeminiKeySuccess,
} from "../_shared/gemini-pool.ts";

/**
 * Tried in order until one answers. Not defensive programming for its own sake:
 * this project has already had a pinned model disappear (`text-embedding-004`
 * 404s on the current key despite being the documented name), and a retired
 * model would otherwise take the assistant down silently.
 */
const GENERATION_MODELS = [
  Deno.env.get("CHAT_MODEL"),
  // Ordered by what actually answers on this key, measured rather than assumed.
  // gemini-2.0-flash and -001 return 429 on *every* attempt — this key has no
  // free quota for them at all, so having them first burned one wasted round
  // trip on every single request. flash-latest is the workhorse; the 2.0 names
  // stay as fallbacks in case a paid plan opens them up, and CHAT_MODEL
  // overrides the whole order without a redeploy.
  "gemini-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
].filter(Boolean) as string[];

/**
 * A 503 from Gemini is "we are busy", not "you are over quota" — it clears in
 * seconds, unlike a 429. Worth one short retry before falling through, because
 * flash-latest is currently the only model that answers at all and giving up on
 * a transient capacity blip would look like an outage to the student.
 */
const RETRY_503_MS = 900;

const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

type Retrieved = {
  entity_id: string;
  title: string;
  subtitle: string | null;
  body: string | null;
  metadata: Record<string, unknown>;
  source_path: string;
  similarity: number;
};

type UserTimetableSlot = {
  day_order: number | null;
  day_name: string;
  hour: number;
  start_time: string;
  end_time: string;
  slot: string | null;
  course_code: string;
  course_name: string;
  faculty_name: string | null;
  room_number: string | null;
  is_lab: boolean;
};

type UserTimetableSchedule = {
  user_id: string;
  user_name: string;
  target_day_label: string;
  slots: UserTimetableSlot[];
  has_classes: boolean;
  requires_auth?: boolean;
  not_synced?: boolean;
};

function tagsOf(row: Retrieved): string[] {
  const raw = row.metadata?.interests ?? row.metadata?.skills;
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

/** How many cards render below a reply. Kept low on purpose — a wall of cards in a chat bubble reads as a dump, not an answer. */
const MAX_FACULTY_SUGGESTIONS = 3;
const MAX_MENTOR_SUGGESTIONS = 3;
/** Notices/documents aren't rendered as cards (no frontend for that yet) — this just caps how many go into the prompt. */
const MAX_REFERENCE_ITEMS = 4;
/** Keeps a full circular from eating the prompt budget when several are retrieved at once. */
const REFERENCE_BODY_CHARS = 500;

/**
 * Short, one-line descriptions of what a route is, used to tell Gemini what
 * the student is looking at and to pick the right "how do I use this" canned
 * reply. Dynamic routes (a specific mentor, a specific post) are matched by
 * prefix since the slug/id itself carries no useful context.
 */
const PAGE_CONTEXT: Array<[test: (path: string) => boolean, label: string]> = [
  [(p) => p === "/", "the homepage"],
  [(p) => p === "/mentors", "the mentors directory, browsing senior student mentors"],
  [(p) => p.startsWith("/mentor/"), "a specific mentor's profile"],
  [(p) => p === "/faculty", "the faculty directory"],
  [(p) => p.startsWith("/faculty/"), "a specific faculty member's profile"],
  [(p) => p === "/ask", "the /ask topic search, which searches mentors, faculty, groups and opportunities at once"],
  [(p) => p === "/search", "the campus search results page"],
  [(p) => p === "/opportunities", "the opportunities page (hackathons, internships, contests)"],
  [(p) => p.startsWith("/opportunities/"), "a specific opportunity's detail page"],
  [(p) => p === "/workspace-groups" || p === "/communities", "the groups/communities directory"],
  [(p) => p.startsWith("/workspace-groups/") || p.startsWith("/communities/"), "a specific group's workspace"],
  [(p) => p === "/posts" || p === "/community-posts", "the community board and discussions"],
  [(p) => p.startsWith("/posts/") || p.startsWith("/community-posts/"), "a community post"],
  [(p) => p === "/events" || p === "/marketplace", "the university events and campus activities"],
  [(p) => p === "/become-mentor", "the mentor application form"],
  [(p) => p === "/certificate", "the certificate info page"],
  [(p) => p === "/messages", "their messages"],
  [(p) => p === "/profile", "their profile page"],
];

function describePage(path: string | null | undefined): string {
  if (!path) return "the Friendly Learning platform";
  const match = PAGE_CONTEXT.find(([test]) => test(path));
  return match ? match[1] : "the Friendly Learning platform";
}

/**
 * Fixed, deterministic answers for questions that don't need retrieval or a
 * model call: what the platform is, how to use the page someone's on, is it
 * free, and so on. Checked before touching Gemini so these are instant, free,
 * and worded the same way every time — the kind of thing that shouldn't be
 * left to chance.
 *
 * `richContent` names a component the frontend already has (the certificate
 * preview, the "become a mentor" CTA card) rather than anything built new for
 * this — see ChatbotModal for the render side.
 */
type CannedAnswer = { text: string; richContent?: "certificate-preview" | "mentor-benefits" };

const CANNED_FAQ: Array<[test: RegExp, build: (path: string | null) => CannedAnswer]> = [
  [
    /^\s*(hi|hey|hello|yo|sup|hii+|heyy+)[\s!.,]*$/i,
    () => ({
      text: "Hey! 👋 I'm your campus guide. Whether you're looking for a mentor, want to find faculty for research, need a hackathon team, or just want to know how a page works — ask away.",
    }),
  ],
  [
    /what\s+(is|does)\s+(this|friendly learning)\b.*(platform|site|app|do|for|about)|^what is this\??$|purpose of this platform/i,
    () => ({
      text:
        "**Friendly Learning** is a complete campus ecosystem for SRM University-AP students — not just a mentorship directory, but a full toolkit to help you find people, form teams, and get things done.\n\n" +
        "Here's what you can do:\n" +
        "- **Community Posts** — share what's on your mind, post a call for hackathon teammates or research collaborators, reply and get replies\n" +
        "- **CampusBrain Search** — the smart search at **/ask**: type a natural-language query like *\"who knows computer vision for a research project\"* and it surfaces matching students and faculty at once\n" +
        "- **Mentors** — senior students who've taken your courses; message them directly, and the best ones earn a verified certificate\n" +
        "- **Faculty** — the full SRM AP faculty directory with research interests, so you can find the right professor for a project or elective\n" +
        "- **Groups** — once you find your people, create a private or public workspace to plan, coordinate, and win together\n" +
        "- **Opportunities** — hackathons, internships, and research calls posted by the campus community\n\n" +
        "The goal: go from *I have an idea* to *I have a team* — without leaving campus.",
    }),
  ],
  [
    /how (do|can) i use this|how does this (page|site|work)|how to use this|what can i do here/i,
    (path) => ({ text: howToUse(path) }),
  ],
  [
    /(is (this|it) free)|(how much (does|would) (this|it) cost)|what.?s the (price|cost)|\bpricing\b/i,
    () => ({
      text: "Yes — **Friendly Learning is free** for every SRM AP student. No payment, no subscription, no hidden tier.",
    }),
  ],
  [
    /who (built|made|created) this|is this official|affiliated with srm|is this (run|made) by srm/i,
    () => ({
      text:
        "Friendly Learning is a **student-built platform**, not an official SRM University-AP product. " +
        "It was created by students at SRM AP to solve a real gap: finding the right people on campus — a senior mentor, a faculty member for research, or teammates for a hackathon — used to mean asking around and hoping for luck. " +
        "This platform makes that search fast, specific, and campus-wide.",
    }),
  ],
  [
    /benefit|why (should i|to) become a mentor|why become a mentor|what do i get.*mentor|advantage.*(being|becoming) a mentor|how (do|can) i become a mentor/i,
    () => ({
      text:
        "Becoming a mentor gets you:\n" +
        "- **A certificate** once you've genuinely helped 3 students — real conversations, not just profile views\n" +
        "- Practice explaining what you know, which sharpens it\n" +
        "- Visibility to juniors in your department\n\n" +
        "Here's what the certificate looks like, and there's an application link below.",
      richContent: "mentor-benefits",
    }),
  ],
  [
    /verify.*certificate|how do i verify|certificate verification/i,
    () => ({
      text:
        "Every certificate has a public verification link, so anyone can check it's real without an account.\n\n" +
        "If you have a certificate ID, go to **/verify/<id>** — the link is printed on the certificate itself. " +
        "To check your own progress toward earning one, that's on your **profile**.",
    }),
  ],
  [
    /difference between mentor and faculty|mentor or faculty|should i (ask|contact) a mentor or (a )?faculty/i,
    () => ({
      text:
        "**Mentors** are senior students — message them directly for course help, career advice, or to ask what a subject is actually like.\n\n" +
        "**Faculty** are professors — their profiles show research interests so you can find one for a project, but you reach them the way you'd normally contact a professor, not through in-app chat.",
    }),
  ],
];

const PAGE_HOWTO: Record<string, string> = {
  "/mentors": "This page lists **senior mentors** by department and skill. Filter by what you're stuck on, then tap **Connect** to message one directly.",
  "/faculty": "This page lists **faculty** by department and research interest. Tap a card to see their profile — faculty aren't messageable in-app, so reach out through their listed contact.",
  "/ask": 'Type a question in plain English — like *"who can help me with DSA"* — and this page searches mentors, faculty, groups, and opportunities in one shot.',
  "/search": 'Search results across the entire SRM AP campus ecosystem — faculty, mentors, students, groups, posts, official documents, and opportunities.',
  "/opportunities": "Browse **hackathons, internships, and contests** posted by the community. Filter by type, then tap one for details and how to apply.",
  "/workspace-groups": "Browse and join **student workspace groups** by interest. Inside a group you can collaborate and post in team channels.",
  "/communities": "Browse and join **student groups** by interest. Inside a group you can collaborate and post in team channels.",
  "/posts": "Browse and share **community board posts** at SRM AP. Ask for academic help, find study partners, or form hackathon teams.",
  "/community-posts": "Browse and share **community board posts** at SRM AP.",
  "/events": "Discover upcoming **university events, workshops, and hackathons** at SRM AP.",
  "/become-mentor": "Fill out this form to apply as a mentor. Once approved, students can find and message you — help **3 students** with real back-and-forth and you'll earn a certificate.",
  "/certificate": "This page shows what the **mentor certificate** looks like and how it's earned — help 3 students with genuine conversations and it's issued automatically.",
  "/marketplace": "Browse university events and campus activities.",
  "/": "This is the homepage — scroll down for an overview, or head to **/mentors**, **/faculty**, or **/ask** to start looking for someone.",
};

function howToUse(path: string | null): string {
  if (path && PAGE_HOWTO[path]) return PAGE_HOWTO[path];
  return "Use the **search bar** or the **/ask** page to find a mentor or faculty member by topic. Tap the **AI** button any time — like now — to ask a question directly.";
}

function matchCannedAnswer(message: string, path: string | null): CannedAnswer | null {
  for (const [test, build] of CANNED_FAQ) {
    if (test.test(message)) return build(path);
  }
  return null;
}

/**
 * "How do I find faculty for research?" is a navigational question, not a
 * content one — the student wants to know a way exists, not a paragraph that
 * re-describes the cards already rendered beside the reply. Sending that kind
 * of question to Gemini produced a full restatement of every retrieved name
 * (real, but redundant with the cards) and inconsistently mentioned the thing
 * that actually answers "how do I find": CampusBrain. Retrieval still runs, so
 * the cards stay real and topical — only the prose is templated instead of
 * generated, for both of the suggested chip questions and their near variants.
 * A query that names an actual topic ("who knows computer vision") does not
 * match these and still gets a generated, content-aware reply.
 */
const FIND_INTENT: Array<[test: RegExp, kind: "faculty" | "mentor"]> = [
  [
    /how (do|can) i find (a |some )?faculty|find (me )?(a |some )?faculty (for|to)|faculty for (a |my )?research|professor for (a |my )?(project|research)/i,
    "faculty",
  ],
  [/how (do|can) i find (a |some )?mentor|find (me )?(a |some )?mentor\b/i, "mentor"],
];

function matchFindIntent(message: string): "faculty" | "mentor" | null {
  for (const [test, kind] of FIND_INTENT) {
    if (test.test(message)) return kind;
  }
  return null;
}

function buildFindReply(kind: "faculty" | "mentor", hasMatches: boolean): string {
  if (!hasMatches) {
    return kind === "faculty"
      ? "No faculty match that yet — try **CampusBrain** at [/ask](/ask) with different wording, or browse the **Faculty Directory** directly."
      : "No mentors match that yet — try **CampusBrain** at [/ask](/ask) with different wording, or browse **Mentors** directly.";
  }
  const noun = kind === "faculty" ? "faculty" : "mentors";
  return `A few ${noun} match — see the cards below. Search this yourself any time with **CampusBrain** at [/ask](/ask).`;
}

type RetrievalResult = {
  faculty: Retrieved[];
  mentors: Retrieved[];
  notices: Retrieved[];
  documents: Retrieved[];
  articles: Retrieved[];
  blogPosts: Retrieved[];
};

const EMPTY_RETRIEVAL: RetrievalResult = { faculty: [], mentors: [], notices: [], documents: [], articles: [], blogPosts: [] };

/**
 * One retrieval definition for the whole platform, cache included.
 *
 * Until an earlier fix, this function read only `body.faculty` and
 * `body.mentors` from semantic-search's response and threw the rest away —
 * see notices/documents below. The same class of bug recurred when
 * `knowledge_articles` (admin-authored rich-text content, 2026-08-21) shipped:
 * semantic-search's default `p_entity_types` didn't include `"article"` at
 * all, so article chunks never even reached this function, regardless of this
 * merge. Both are fixed now, but the lesson is the same — a new
 * knowledge_chunks entity_type needs three things to actually surface: the
 * projector, semantic-search's default types + grouping, and this merge.
 */
async function retrieve(query: string): Promise<RetrievalResult> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 8 }),
    });

    if (!response.ok) return EMPTY_RETRIEVAL;

    const body = await response.json();
    return {
      faculty: body.faculty ?? [],
      mentors: body.mentors ?? [],
      notices: body.notices ?? [],
      documents: body.documents ?? [],
      articles: body.articles ?? [],
      blogPosts: body.blog_posts ?? [],
    };
  } catch (error) {
    // A retrieval failure degrades the answer; it must not fail the whole reply.
    console.error("retrieval failed:", error);
    return EMPTY_RETRIEVAL;
  }
}

/**
 * A knowledge_articles author can legitimately write a real URL into an
 * article's body (e.g. "apply at https://cap.srmap.edu.in/") and the model
 * quoting it back is correct, grounded behaviour — not a hallucination. What
 * is never legitimate is a URL that appears in the model's answer but not
 * anywhere in what was actually retrieved. Caught live 2026-08-21: an
 * over-broad first version of this guard stripped a URL the model had
 * correctly cited from a retrieved article, and the retry that followed
 * produced a *vaguer* fabrication ("the university portal") instead of the
 * real one — worse, not better. This version only blocks a URL that is
 * genuinely absent from the retrieved reference bodies.
 */
const URL_PATTERN = /\bhttps?:\/\/\S+/gi;

function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_PATTERN)].map((m) => m[0].replace(/[.,;:)\]]+$/, ""));
}

function unsourcedUrls(text: string, sourceUrls: Set<string>): string[] {
  return extractUrls(text).filter((u) => !sourceUrls.has(u));
}

function stripUrls(text: string, urls: string[]): string {
  let cleaned = text;
  for (const url of urls) {
    cleaned = cleaned.split(url).join("");
  }
  cleaned = cleaned.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([.,!?])/g, "$1");
  return `${cleaned.trim()}\n\n_I don't have a verified link for this — please check with the relevant university office directly rather than following any link I might have mentioned._`;
}

async function generate(prompt: string): Promise<{ text: string; model: string }> {
  const tried: string[] = [];
  const keys = getPrioritizedGeminiKeys();

  // Smart load balancing across keys, inner loop over models
  for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
    const key = keys[keyIndex];
    let keyHit429 = false;

    for (const model of GENERATION_MODELS) {
      // Reasoning models bill thinking tokens against maxOutputTokens, which cut
      // an early reply off mid-sentence at ~40 words. The obvious fix —
      // thinkingConfig: { thinkingBudget: 0 } — is a trap: `gemini-flash-latest`
      // rejects it with 400 INVALID_ARGUMENT on v1beta, so it broke the one model
      // still answering. A generous ceiling plus the MAX_TOKENS guard below
      // handles it without depending on a parameter a model may not accept.
      const call = () =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.4, maxOutputTokens: 3000, topP: 0.9 },
            }),
          },
        );

      let response = await call();

      // 503 means Gemini is busy, not that the key is over quota — it clears in
      // seconds. One retry, only for that status; a 429 is retried by the student
      // a minute later, not by us.
      if (response.status === 503) {
        markGeminiKeyCooldown(key, 503);
        await new Promise((resolve) => setTimeout(resolve, RETRY_503_MS));
        response = await call();
      }

      if (response.status === 429) {
        markGeminiKeyCooldown(key, 429);
        keyHit429 = true;
        tried.push(`${model}@key${keyIndex + 1}=429`);
        break; // whole key is rate-limited; skip to next key immediately
      }

      // Any failure falls through to the next candidate rather than throwing.
      if (!response.ok) {
        tried.push(`${model}@key${keyIndex + 1}=${response.status}:${(await response.text()).slice(0, 120)}`);
        continue;
      }

      const body = await response.json();
      const candidate = body.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      // A MAX_TOKENS finish means the student would see half a sentence. Better to
      // fall through to another model than to ship a truncated reply.
      if (text && candidate?.finishReason === "MAX_TOKENS") {
        tried.push(`${model}@key${keyIndex + 1}=truncated-at-${text.length}-chars`);
        continue;
      }
      if (text) {
        markGeminiKeySuccess(key);
        return { text: text.trim(), model };
      }

      // An empty candidate means a safety block or an exhausted token budget;
      // both are worth naming in the debug trail rather than looking like a 404.
      tried.push(`${model}@key${keyIndex + 1}=empty:${JSON.stringify(body).slice(0, 150)}`);
    }
    if (keyHit429) continue;
  }

  throw new Error(`no usable generation model across ${keys.length} key(s). ${tried.join(" | ")}`);
}

function getTemporalContext(): { todayText: string; currentTimeText: string } {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const todayText = new Intl.DateTimeFormat("en-IN", options).format(now);
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const currentTimeText = new Intl.DateTimeFormat("en-IN", timeOptions).format(now);
  return { todayText, currentTimeText };
}

async function resolveUserTimetables(
  mentors: Retrieved[],
  query: string,
  callerUserId?: string | null,
  callerUserName?: string | null,
): Promise<UserTimetableSchedule[]> {
  const hasTimetableIntent = /\b(timetable|time[\s-]?table|class(?:es)?|schedule|lecture|period|periods|subject)\b/i.test(query);
  if (!hasTimetableIntent) return [];

  const q = query.toLowerCase();
  const isFirstPerson =
    /\b(my|me|i|myself|mine)\b/i.test(query) ||
    /\b(do i have|am i free|what classes do i have|what do i have)\b/i.test(query);

  let offsetDays: number | null = null;
  if (/\byesterday\b/.test(q)) {
    offsetDays = -1;
  } else if (/\btoday\b|\btoda+y\b|\bnow\b|\bcurrently\b|\bright now\b|\bat the moment\b/.test(q)) {
    offsetDays = 0;
  } else if (/\btomorrow\b|\btomm?orr?ow?\b/.test(q)) {
    offsetDays = 1;
  } else {
    const dayMap: Record<string, number> = {
      monday: 1, mon: 1,
      tuesday: 2, tue: 2,
      wednesday: 3, wed: 3,
      thursday: 4, thu: 4,
      friday: 5, fri: 5,
      saturday: 6, sat: 6,
      sunday: 7, sun: 7,
    };
    const weekdayMatch = q.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/);
    if (weekdayMatch) {
      const matchedName = weekdayMatch[1];
      const targetDow = dayMap[matchedName];
      if (targetDow !== undefined) {
        const now = new Date();
        const istDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
        const [y, mo, d] = istDateStr.split("-").map(Number);
        const istLocal = new Date(y, mo - 1, d);
        const currentDow = istLocal.getDay() === 0 ? 7 : istLocal.getDay();
        offsetDays = targetDow - currentDow;
      }
    } else {
      offsetDays = 0;
    }
  }

  if (offsetDays === null) offsetDays = 0;

  const targetDate = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(targetDate);

  const istDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(targetDate);
  const [y, mo, d] = istDateStr.split("-").map(Number);
  const istLocal = new Date(y, mo - 1, d);
  const isodow = istLocal.getDay() === 0 ? 7 : istLocal.getDay();

  const dayLabel =
    offsetDays === 0
      ? `Today (${dayName})`
      : offsetDays === 1
      ? `Tomorrow (${dayName})`
      : offsetDays === -1
      ? `Yesterday (${dayName})`
      : `${dayName}`;

  const schedules: UserTimetableSchedule[] = [];

  if (isFirstPerson) {
    if (!callerUserId) {
      schedules.push({
        user_id: "anon",
        user_name: "You",
        target_day_label: dayLabel,
        slots: [],
        has_classes: false,
        requires_auth: true,
      });
    } else {
      try {
        const { data: rows } = await supabase.rpc("get_user_weekly_timetable", {
          p_user_id: callerUserId,
        });
        if (Array.isArray(rows)) {
          if (rows.length === 0) {
            schedules.push({
              user_id: callerUserId,
              user_name: callerUserName || "You",
              target_day_label: dayLabel,
              slots: [],
              has_classes: false,
              not_synced: true,
            });
          } else {
            const todaySlots = rows.filter((r: any) => {
              const dn = (r.day_name ?? "").trim().toLowerCase();
              if (dn === dayName.toLowerCase()) return true;
              if (dn === `day ${isodow}`) return true;
              if (r.day_order !== null && r.day_order === isodow) return true;
              return false;
            }).sort((a: any, b: any) => a.hour - b.hour);

            schedules.push({
              user_id: callerUserId,
              user_name: callerUserName || "You",
              target_day_label: dayLabel,
              slots: todaySlots,
              has_classes: todaySlots.length > 0,
            });
          }
        }
      } catch (err) {
        console.warn("ai-chatbot get_user_weekly_timetable error for caller:", err);
      }
    }
  }

  const subjects = mentors.filter((m) => m.entity_id && m.entity_id !== callerUserId);
  if (subjects.length > 0) {
    await Promise.all(
      subjects.slice(0, 3).map(async (m) => {
        try {
          const { data: rows } = await supabase.rpc("get_user_weekly_timetable", {
            p_user_id: m.entity_id,
          });
          if (Array.isArray(rows)) {
            const todaySlots = rows.filter((r: any) => {
              const dn = (r.day_name ?? "").trim().toLowerCase();
              if (dn === dayName.toLowerCase()) return true;
              if (dn === `day ${isodow}`) return true;
              if (r.day_order !== null && r.day_order === isodow) return true;
              return false;
            }).sort((a: any, b: any) => a.hour - b.hour);

            schedules.push({
              user_id: m.entity_id,
              user_name: m.title,
              target_day_label: dayLabel,
              slots: todaySlots,
              has_classes: todaySlots.length > 0,
            });
          }
        } catch (err) {
          console.warn(`ai-chatbot get_user_weekly_timetable error for ${m.entity_id}:`, err);
        }
      }),
    );
  }

  return schedules;
}

/**
 * The grounding rules are the safety boundary, not styling. These are named
 * employees of a real university and named students; the model may summarise
 * what is on file and nothing else.
 */
function buildPrompt(
  message: string,
  faculty: Retrieved[],
  mentors: Retrieved[],
  references: Retrieved[],
  blogPosts: Retrieved[],
  path: string | null,
  mentorPresenceMap: Map<string, any> = new Map(),
  mentorEventsMap: Map<string, any[]> = new Map(),
  timetableSchedules: UserTimetableSchedule[] = [],
): string {
  const { todayText, currentTimeText } = getTemporalContext();

  const describe = (row: Retrieved, kind: string) => {
    const tags = tagsOf(row);
    let desc = `- ${row.title} (${kind}${row.subtitle ? `, ${row.subtitle}` : ""})`;
    if (tags.length) {
      desc += `\n  Listed ${kind === "faculty" ? "research interests" : "skills"}: ${tags.join(", ")}`;
    }
    if (kind === "senior student") {
      const presence = mentorPresenceMap.get(row.entity_id);
      if (presence) {
        let status: string;
        if (presence.current_class_name) {
          status = `Currently in class "${presence.current_class_name}" (${presence.current_class_code || ''}${presence.current_class_room ? `, Room ${presence.current_class_room}` : ''} until ${presence.current_class_end || 'class ends'}) — busy / in lecture`;
        } else if (presence.current_event_title) {
          status = `Currently attending campus event "${presence.current_event_title}" (until ${presence.current_event_end || 'event ends'}) — busy / slower to reply`;
        } else if (presence.is_active_now) {
          status = "Active & accepting connection requests";
        } else {
          status = `Paused / Away${presence.available_from ? ` until ${new Date(presence.available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ""}`;
        }
        desc += `\n  Availability status: ${status}`;
        if (presence.availability_note) {
          desc += ` (Custom note: "${presence.availability_note}")`;
        }
        if (presence.median_reply_minutes) {
          desc += `\n  Typical reply turnaround: ~${presence.median_reply_minutes < 60 ? `${presence.median_reply_minutes} min` : `${Math.round(presence.median_reply_minutes / 60)} hr`}`;
        }
        const events = mentorEventsMap.get(row.entity_id);
        if (events && events.length > 0) {
          // Both RSVP kinds are shown, not just "going" — a bookmark is still
          // useful context for "what's Gyan up to" — but each line keeps its
          // status label so the model can never call an "interested" a
          // confirmed attendance.
          desc += "\n  Campus events RSVP'd:";
          for (const e of events) {
            const when = e.is_all_day ? "all day" : `${e.start_date} to ${e.end_date}`;
            const now = e.is_happening_now ? " [happening now]" : "";
            desc += `\n    - "${e.title}" — ${String(e.status).toUpperCase()}${now}, ${when}`;
          }
        }
        desc += `\n  Profile link: /mentor/${presence.slug || row.entity_id}`;
      }
    }
    return desc;
  };

  const people = [
    ...faculty.map((f) => describe(f, "faculty")),
    ...mentors.map((m) => describe(m, "senior student")),
  ].join("\n");

  // Notices carry a real page to link to (/notices/:id); campus_documents has
  // no detail route yet, so it's cited by title only rather than a dead link.
  const describeReference = (row: Retrieved) => {
    const body = (row.body ?? "").slice(0, REFERENCE_BODY_CHARS);
    const link = row.source_path?.startsWith("/notices/") ? `\n  Link: ${row.source_path}` : "";
    return `- ${row.title}${row.subtitle ? ` (${row.subtitle})` : ""}: ${body}${link}`;
  };
  const referenceText = references.map(describeReference).join("\n");

  // Blog posts always carry a link (unlike the notice-only rule above) — they
  // are the one reference type worth linking to even when just mentioned in
  // passing, since there's no administrative-accuracy risk in pointing a
  // student at another student's write-up.
  const describeBlogPost = (row: Retrieved) => {
    const body = (row.body ?? "").slice(0, REFERENCE_BODY_CHARS);
    return `- ${row.title}${row.subtitle ? ` (${row.subtitle})` : ""}: ${body}\n  Link: ${row.source_path}`;
  };
  const blogPostText = blogPosts.map(describeBlogPost).join("\n");

  const timetableText = timetableSchedules.length > 0
    ? "\n\nTIMETABLE_SCHEDULE (ground truth class schedule from student_timetables):\n"
      + timetableSchedules.map((s) => {
        if (s.requires_auth) {
          return `- The student asked for their own timetable ("${message}"), but is currently NOT signed in. State clearly that they must sign in to view their personal student timetable.`;
        }
        if (s.not_synced) {
          return `- ${s.user_name}: Has NOT imported or synced their timetable from the SRM student portal yet. State clearly that they can sync their timetable by logging into the SRM Portal in Settings / Profile to see their classes here.`;
        }
        if (!s.has_classes) {
          return `- ${s.user_name}: NO classes scheduled on ${s.target_day_label} as per their timetable.`;
        }
        const lines = s.slots.map((sl) => {
          const room = sl.room_number ? `, Room ${sl.room_number}` : "";
          const lab = sl.is_lab ? " [LAB]" : "";
          const prof = sl.faculty_name ? ` (Faculty: ${sl.faculty_name})` : "";
          return `  • Hour ${sl.hour} (${sl.start_time.slice(0, 5)}–${sl.end_time.slice(0, 5)}): ${sl.course_name} (${sl.course_code})${lab}${room}${prof}`;
        }).join("\n");
        return `- ${s.user_name} has ${s.slots.length} class${s.slots.length === 1 ? "" : "es"} on ${s.target_day_label}:\n${lines}`;
      }).join("\n")
    : "";

  return `You are the assistant for Friendly Learning, a student-built campus ecosystem at SRM University-AP. The platform lets students: post ideas and calls for teammates on the community board; use CampusBrain (the smart natural-language search at /ask) to find matching students and faculty in one query; connect with senior student mentors for course help and career advice; browse the full SRM AP faculty directory by research interest; form private or public group workspaces after finding the right people; discover hackathons, internships and research opportunities; earn a verified certificate by genuinely helping 3 students as a mentor; and look up official campus notices, circulars and administrative info (who to contact for what, help desks, policies) that admins have published.

TEMPORAL CONTEXT (Indian Standard Time / Asia/Kolkata):
- Today: ${todayText}
- Current Time Right Now: ${currentTimeText} IST
- Academic Year: 2026-27

The student is currently looking at: ${describePage(path)}.

A student asked: "${message}"

${people ? `These people were retrieved from the platform's database as topical matches:\n${people}` : "No people in the database matched this question."}

${referenceText ? `These official notices/circulars/administrative records were retrieved as topical matches:\n${referenceText}` : "No official notice or record in the database matched this question."}

${blogPostText ? `These community blog posts were retrieved as topical matches. They are personal writing by individual students or mentors, NOT official university sources — never present anything from them as institutional fact or policy:\n${blogPostText}` : ""}${timetableText}

Rules you must follow:
1. Only describe a person using the interests or skills listed above. Do not add biography, opinions, achievements, seniority, or quality judgements — you do not know them.
2. Never invent a name. If nobody is listed above, say the directory has no match yet and give general advice instead.
3. Do not rank people by how good they are. They are ordered by topical match only.
4. Do not mention grades, ratings, or how easy a professor is.
5. For administrative questions (who to contact, fees, penalties, IDs, WiFi/IT issues, hostel, exams, policies, any named office or role) answer **only** from the official notices/records listed above — never invent a name, phone number, email address, website, URL, office, location, or policy detail that isn't stated there, even if it sounds plausible for a university. A URL is only real if it is written verbatim in the retrieved records above — you may repeat one exactly as given, but never construct, modify, guess, or complete one yourself. If the retrieved record does not mention any web form, portal, or URL for a process, say so — do not assume or guess that one exists. If nothing relevant was retrieved, say plainly that this isn't on file yet and suggest the student check with the relevant university office directly, without guessing which one.
6. When you cite a notice that has a Link, include it as a markdown link, e.g. [the notice](/notices/abc-123).
7. Be warm and brief — you are talking to a nervous first-year. 120 words or fewer.
8. Do not repeat the retrieved lists verbatim; people are already shown to the student as cards beside your reply. Refer to them naturally.
9. Format the reply in markdown: short paragraphs (1-3 sentences), **bold** on key terms or names, and a bullet list when you're enumerating more than two things. Never return one undifferentiated block of text.
10. If the question is about the page they're currently on, answer with that page in mind rather than generically.
11. If the student asks whether a specific mentor is free or available right now (e.g. "Is Gyan free right now?", "Is [Mentor] available?"): answer directly with their real-time availability status, whether they are currently attending a campus event, their custom availability note if on file, and typical response turnaround time from the context above, and invite the student to send them a message.
12. If the student asks what events a mentor is attending or going to (e.g. "What events is Gyan attending?", "Is Gyan going to [Event]?"): list only the events under that mentor's "Campus events RSVP'd" above, and say plainly whether each is GOING (confirmed) or INTERESTED (bookmarked, not a commitment) — never call an INTERESTED event a confirmed attendance. If nothing is listed there, say they have no RSVPs on file rather than guessing.
13. If the student asks for their own timetable or a mentor's schedule (e.g. "my timetable", "my todays time table", "what is my schedule today", "does [Mentor] have classes tomorrow"):
    - Consult TIMETABLE_SCHEDULE above.
    - If they need to sign in, tell them warmly: "Please **sign in** to view your personal student timetable."
    - If they haven't synced their SRM portal, guide them to sync it in **Settings / Profile**.
    - If they have no classes on that day, state that clearly.
    - If they have classes, list their classes with start/end times, course names, and room numbers.
14. Community blog posts are one student's or mentor's personal experience or opinion, never an official source — never use one to answer an administrative question (rule 5), and when you do mention one, frame it as "a student wrote about..." rather than stating its content as fact. When you cite one, include it as a markdown link using its Link, e.g. [their post](/blogs/my-slug).

Answer the student's question directly.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const currentSessionId = crypto.randomUUID();

  try {
    const { message, sessionId, userId, path } = await req.json();
    if (!message) throw new Error("No message provided");

    const session = sessionId || currentSessionId;
    const currentPath: string | null = typeof path === "string" ? path : null;

    const userConversationId = crypto.randomUUID();
    await supabase.from("ai_conversations").insert({
      id: userConversationId,
      user_id: userId,
      session_id: session,
      message,
      response: "",
      message_type: "user",
      context: { original_query: message },
    });

    // Fixed answers for questions that don't need retrieval or a model call —
    // instant, free, and worded consistently. Still logged to history like any
    // other reply.
    const canned = matchCannedAnswer(message, currentPath);
    if (canned) {
      await supabase.from("ai_conversations").insert({
        id: crypto.randomUUID(),
        user_id: userId,
        session_id: session,
        message,
        response: canned.text,
        message_type: "ai",
        suggested_mentors: [],
        context: {
          user_message_id: userConversationId,
          grounded: false,
          model: "canned",
        },
      });

      return new Response(
        JSON.stringify({
          aiResponse: canned.text,
          model: "canned",
          richContent: canned.richContent ?? null,
          suggestedMentors: [],
          suggestedFaculty: [],
          hasMentorSuggestions: false,
          hasFacultySuggestions: false,
          sessionId: session,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { faculty, mentors, notices, documents, articles, blogPosts } = await retrieve(message);
    const shownMentors = mentors.slice(0, MAX_MENTOR_SUGGESTIONS);
    const shownFaculty = faculty.slice(0, MAX_FACULTY_SUGGESTIONS);
    // Merged rather than kept separate: all three are "official record" to the
    // prompt, and semantic-search already ranks the merge by similarity since
    // each list is a filter over the same ordered result set.
    const shownReferences = [...notices, ...documents, ...articles]
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, MAX_REFERENCE_ITEMS);
    // Kept separate from shownReferences on purpose: a blog post is written by
    // a student or mentor, not an admin, and the prompt below tells the model
    // these are "official notices/circulars/administrative records" — folding
    // in someone's personal essay would let the model cite an opinion with the
    // same authority as a real policy document, exactly what rule 5's
    // administrative-questions guardrail exists to prevent.
    const shownBlogPosts = blogPosts.sort((a, b) => b.similarity - a.similarity).slice(0, MAX_REFERENCE_ITEMS);

    // The suggestion cards read full mentor rows (skills.slice, rating.toFixed),
    // so the retrieved IDs are rehydrated rather than passed through as chunks.
    // Nulls here would crash the card, hence the defaults.
    let suggestedMentors: Array<Record<string, unknown>> = [];
    const mentorLiveMap = new Map<string, any>();
    const mentorEventsMap = new Map<string, any[]>();
    if (shownMentors.length) {
      try {
        const { data: livePresence } = await supabase.rpc("get_mentors_live_availability", {
          p_mentor_ids: shownMentors.map((m) => m.entity_id),
        });
        (livePresence ?? []).forEach((p: any) => mentorLiveMap.set(p.mentor_id, p));
      } catch (err) {
        console.warn("ai-chatbot get_mentors_live_availability warning:", err);
      }

      // Per-mentor RPC because get_user_event_schedule takes one user at a
      // time; shownMentors is already capped by MAX_MENTOR_SUGGESTIONS so
      // this is at most that many parallel calls, same shape as
      // resolveUserEventSchedules in generate-ai-overview.
      await Promise.all(
        shownMentors.map(async (m) => {
          try {
            const { data: events } = await supabase.rpc("get_user_event_schedule", {
              p_user_id: m.entity_id,
            });
            if (Array.isArray(events) && events.length > 0) {
              mentorEventsMap.set(m.entity_id, events);
            }
          } catch (err) {
            console.warn("ai-chatbot get_user_event_schedule warning:", err);
          }
        }),
      );

      const { data } = await supabase
        .from("mentors")
        .select("id, name, department, skills, rating, profile_image, bio, is_available, available_from, availability_note, slug")
        .in("id", shownMentors.map((m) => m.entity_id));

      const order = new Map(shownMentors.map((m, index) => [m.entity_id, index]));
      suggestedMentors = (data ?? [])
        .map((row) => {
          const presence = mentorLiveMap.get(row.id);
          return {
            ...row,
            skills: row.skills ?? [],
            rating: row.rating ?? 0,
            is_active_now: presence?.is_active_now ?? (row.is_available ?? true),
            median_reply_minutes: presence?.median_reply_minutes ?? null,
            relevanceScore: shownMentors.find((m) => m.entity_id === row.id)?.similarity ?? 0,
          };
        })
        // Keep the retrieval ranking; the IN query returns arbitrary order.
        .sort((a, b) => (order.get(a.id as string) ?? 0) - (order.get(b.id as string) ?? 0));
    }

    const suggestedFaculty = shownFaculty.map((f) => ({
      id: f.entity_id,
      name: f.title,
      department: (f.metadata?.department as string) ?? null,
      slug: (f.metadata?.slug as string) ?? null,
      image_url: (f.metadata?.image_url as string) ?? null,
      interests: tagsOf(f).slice(0, 4),
      path: f.source_path,
      relevanceScore: f.similarity,
    }));

    let userProfileName: string | null = null;
    if (userId) {
      try {
        const { data: userRow } = await supabase.from("users").select("name").eq("id", userId).maybeSingle();
        if (userRow?.name) userProfileName = userRow.name;
      } catch (err) {
        console.warn("ai-chatbot fetch user name error:", err);
      }
    }

    const timetableSchedules = await resolveUserTimetables(shownMentors, message, userId, userProfileName);

    const findIntent = matchFindIntent(message);
    let aiResponse: string;
    let usedModel: string;

    if (findIntent) {
      // Skips Gemini entirely: instant, free, and the reply can't drift into
      // restating the cards. hasMentorSuggestions/hasFacultySuggestions below
      // still reflect real retrieval, so the cards are never empty behind a
      // reply that implies matches exist.
      aiResponse = buildFindReply(findIntent, shownFaculty.length > 0 || shownMentors.length > 0);
      usedModel = "template";
    } else {
      // Only the people whose cards are rendered may be named in the prose.
      // More may be retrieved than shown, and the model happily named the
      // extra one — not a hallucination (it was retrieved) but the student
      // sees a name with no card beside it, which reads exactly like one.
      const prompt = buildPrompt(
        message,
        shownFaculty,
        shownMentors,
        shownReferences,
        shownBlogPosts,
        currentPath,
        mentorLiveMap,
        mentorEventsMap,
        timetableSchedules,
      );
      const sourceUrls = new Set(
        [...shownReferences, ...shownBlogPosts].flatMap((r) => extractUrls(r.body ?? "")),
      );
      let generated = await generate(prompt);

      // See unsourcedUrls' comment: one retry with an explicit correction
      // first, since a rephrase is a better answer than a stripped sentence —
      // but only for a URL that's genuinely not in the retrieved data; a real
      // one the model copied from a retrieved article is left alone.
      let badUrls = unsourcedUrls(generated.text, sourceUrls);
      if (badUrls.length) {
        generated = await generate(
          `${prompt}\n\nYour previous answer included a website link (${badUrls[0]}) that does not appear anywhere in the retrieved data above — it was fabricated. Answer again. Only mention a URL if it is written verbatim in the retrieved records above; never invent, modify, or guess one.`,
        );
        badUrls = unsourcedUrls(generated.text, sourceUrls);
      }
      if (badUrls.length) {
        generated = { text: stripUrls(generated.text, badUrls), model: generated.model };
      }
      usedModel = generated.model;

      // Whether the model's prose mentions CampusBrain is up to Gemini and it
      // regularly doesn't, even though buildPrompt describes it. Appended in
      // code rather than asked of the model so it's guaranteed rather than
      // hoped for, and only when real matches were actually found — a student
      // already looking at cards is the one this tip is for.
      aiResponse =
        shownFaculty.length > 0 || shownMentors.length > 0
          ? `${generated.text}\n\n💡 **CampusBrain** — the smart search at [/ask](/ask) — does this automatically. Describe your project or what you're looking for, and it surfaces the best-matching faculty and seniors on its own.`
          : generated.text;
    }

    await supabase.from("ai_conversations").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      session_id: session,
      message,
      response: aiResponse,
      message_type: "ai",
      suggested_mentors: suggestedMentors,
      context: {
        user_message_id: userConversationId,
        mentor_suggestions_count: suggestedMentors.length,
        faculty_suggestions_count: suggestedFaculty.length,
        grounded: true,
        model: usedModel,
      },
    });

    return new Response(
      JSON.stringify({
        aiResponse,
        model: usedModel,
        richContent: null,
        suggestedMentors,
        suggestedFaculty,
        hasMentorSuggestions: suggestedMentors.length > 0,
        hasFacultySuggestions: suggestedFaculty.length > 0,
        sessionId: session,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("ai-chatbot failed:", detail);

    // Edge-function logs surface status lines but not console output, which
    // makes a 500 here effectively undiagnosable in production. The real reason
    // is returned only to a caller holding CRON_SECRET, never to a student.
    const cronSecret = Deno.env.get("CRON_SECRET");
    const debug = cronSecret && req.headers.get("x-cron-secret") === cronSecret;

    // Quota is the failure a student will actually meet on the free tier, and
    // "wait a minute" is actionable where a generic apology is not.
    const busy = detail.includes("429") || detail.includes("503");

    return new Response(
      JSON.stringify({
        ...(debug ? { debug: detail } : {}),
        aiResponse: busy
          ? "I'm getting a lot of questions right now — give me a minute and ask again. In the meantime, /ask searches faculty and seniors directly and always works."
          : "I hit a problem answering that. Try again in a moment — or browse /ask, which searches faculty and seniors directly.",
        richContent: null,
        suggestedMentors: [],
        suggestedFaculty: [],
        hasMentorSuggestions: false,
        hasFacultySuggestions: false,
        sessionId: currentSessionId,
      }),
      { status: busy ? 429 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
