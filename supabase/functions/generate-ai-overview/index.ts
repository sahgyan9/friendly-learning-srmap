import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getPrioritizedGeminiKeys,
  markGeminiKeyCooldown,
  markGeminiKeySuccess,
} from "../_shared/gemini-pool.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MODEL = "gemini-flash-latest";

// A single entity can back several indexed chunks (a multi-section document
// like the Code of Conduct, or a faculty member's separate interest/skill
// chunks post-20260817000000_multi_chunk_indexing.sql). Ranking is
// similarity-only with no per-entity weighting, so an entity with many
// chunks gets many independent chances to clear the similarity floor on any
// loosely related query -- 41 Code of Conduct sections vs. 6 academic
// calendar sections meant Code of Conduct dominated results regardless of
// topical fit. Capping chunks per entity fixes that at the source, and
// capping total matches keeps the prompt and the citation list bounded.
const MAX_CHUNKS_PER_ENTITY = 2;
const MAX_MATCHES = 8;

type CalendarFact = {
  dateLabel: string; // e.g. "Today (Friday, 21 August 2026)"
  is_holiday: boolean;
  occasion_name: string | null;
  source: "calendar" | "notice_override" | "none";
  notice_title: string | null;
  notice_summary: string | null;
};

type Retrieved = {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
  body?: string | null;
  metadata: Record<string, unknown>;
  source_path: string;
  similarity: number;
};

function getTemporalContext(): { todayText: string; tomorrowText: string; currentMonthYear: string; currentTimeText: string } {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const todayText = new Intl.DateTimeFormat("en-IN", options).format(now);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowText = new Intl.DateTimeFormat("en-IN", options).format(tomorrow);
  const monthYearOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "long",
  };
  const currentMonthYear = new Intl.DateTimeFormat("en-IN", monthYearOptions).format(now);
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const currentTimeText = new Intl.DateTimeFormat("en-IN", timeOptions).format(now);
  return { todayText, tomorrowText, currentMonthYear, currentTimeText };
}

/** YYYY-MM-DD in Asia/Kolkata, `offsetDays` from now — en-CA formats as ISO directly. */
function isoDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
}

/**
 * Which date(s) is this query actually about? Deliberately narrow (today /
 * tomorrow / yesterday only) rather than a general date parser — those are
 * the phrasings that showed up in the reported bug, and a wrong guess here
 * would inject a *wrong* resolved fact, which is worse than injecting none.
 */
function resolveCalendarDates(query: string): { label: string; iso: string }[] {
  const q = query.toLowerCase();
  const dates: { label: string; iso: string }[] = [];
  if (/\byesterday\b/.test(q)) dates.push({ label: "Yesterday", iso: isoDate(-1) });
  // "now"/"currently"/"right now" ask about the present day just as much as the
  // word "today" does (e.g. "can i get outpass now") -- without this, queries
  // phrased that way skip RESOLVED_FACTS entirely and fall back to the model
  // reading the working-days grid itself, the exact failure mode this
  // resolver exists to eliminate.
  if (/\btoday\b|\btoda+y\b|\bnow\b|\bcurrently\b|\bright now\b|\bat the moment\b/.test(q)) {
    dates.push({ label: "Today", iso: isoDate(0) });
  }
  if (/\btomorrow\b|\btomm?orr?ow?\b/.test(q)) dates.push({ label: "Tomorrow", iso: isoDate(1) });
  return dates;
}

/**
 * The deterministic half of "retrieve, then explain": ask Postgres whether
 * each resolved date is a declared holiday, instead of asking the model to
 * read a compressed working-days grid and cross-reference a separate
 * occasion table. Falls back to nothing (not an error) if the resolver
 * migration hasn't been applied yet, or if academic_calendar_days simply
 * has no row for that date — the prompt already has RAG-retrieved chunks
 * as a fallback either way.
 */
async function resolveCalendarFacts(query: string): Promise<CalendarFact[]> {
  if (!SUPABASE_SERVICE_ROLE_KEY) return [];
  const targets = resolveCalendarDates(query);
  if (targets.length === 0) return [];

  const facts: CalendarFact[] = [];
  for (const { label, iso } of targets) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_calendar_day`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ p_date: iso }),
      });
      if (!response.ok) continue; // e.g. function not deployed yet — degrade silently
      const rows = await response.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) continue; // no data for this date; let RAG/the model's own reading handle it
      facts.push({
        dateLabel: label,
        is_holiday: !!row.is_holiday,
        occasion_name: row.occasion_name ?? null,
        source: row.source ?? "none",
        notice_title: row.notice_title ?? null,
        notice_summary: row.notice_summary ?? null,
      });
    } catch (error) {
      console.error(`get_calendar_day failed for ${iso}:`, error);
    }
  }
  return facts;
}

// Reuse semantic-search to leverage the query cache and central embedding logic.
async function retrieve(query: string): Promise<Retrieved[]> {
  try {
    const { todayText, tomorrowText, currentMonthYear } = getTemporalContext();
    let searchQuery = query;

    // Temporal Query Expansion for relative time queries (e.g. today, tomorrow, tommorow, holiday, day order)
    const hasTemporalWords = /\b(today|toda+y|tomorrow|tomm?orr?ow?|yesterday|now|currently|right now|at the moment|this week|next week|this month|next month|day order|holiday|holidays|working day)\b/i.test(query);
    if (hasTemporalWords) {
      searchQuery = `${query} (${todayText} / ${tomorrowText} Academic Calendar AY 2026-27 ${currentMonthYear} working days holidays)`;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: searchQuery, limit: 12 }),
    });

    if (!response.ok) return [];

    const body = await response.json();
    // semantic-search returns grouped results. We flatten them back to a single list.
    // Every entity_type search_knowledge can return needs a line here — "articles"
    // (admin-authored knowledge_articles) and "students" were missing, so those
    // chunks were retrieved and then silently dropped on the floor before ever
    // reaching the prompt, regardless of how well they matched the query.
    const all = [
      ...(body.faculty ?? []),
      ...(body.mentors ?? []),
      ...(body.students ?? []),
      ...(body.opportunities ?? []),
      ...(body.communities ?? []),
      ...(body.posts ?? []),
      ...(body.documents ?? []),
      ...(body.notices ?? []),
      ...(body.articles ?? []),
      ...(body.other ?? []),
    ] as Retrieved[];

    // Re-sort by similarity since flattening mixes the groups
    const bySimilarity = all.sort((a, b) => b.similarity - a.similarity);

    // Cap chunks per entity (see MAX_CHUNKS_PER_ENTITY above), then cap the
    // total so the prompt and the citation list stay bounded regardless of
    // how many chunks search_knowledge returned.
    //
    // A multi-section document (Code of Conduct: 41 sections) does NOT share
    // one entity_id across sections -- rebuild_document_chunks() gives each
    // campus_documents row (one per section) its own entity_id, so grouping
    // by entity_id alone is a no-op for documents, the exact case this cap
    // exists for. Group document chunks by their parent document (metadata
    // .slug) instead; every other entity_type still groups by entity_id.
    const groupKey = (m: Retrieved): string => {
      if (m.entity_type === "document") {
        const slug = (m.metadata as { slug?: string } | undefined)?.slug;
        return `document:${slug ?? m.entity_id}`;
      }
      return `${m.entity_type}:${m.entity_id}`;
    };

    const perGroupCount = new Map<string, number>();
    const deduped = bySimilarity.filter((m) => {
      const key = groupKey(m);
      const count = perGroupCount.get(key) ?? 0;
      if (count >= MAX_CHUNKS_PER_ENTITY) return false;
      perGroupCount.set(key, count + 1);
      return true;
    });

    return deduped.slice(0, MAX_MATCHES);
  } catch (error) {
    console.error("retrieval failed:", error);
    return [];
  }
}

function buildPrompt(query: string, matches: Retrieved[], calendarFacts: CalendarFact[]): string {
  const { todayText, tomorrowText, currentTimeText } = getTemporalContext();

  const resolvedFactsBlock = calendarFacts.length > 0
    ? "\n\nRESOLVED_FACTS (computed directly from the official calendar database — this is ground truth, more authoritative than anything in the resources below; do not re-derive or second-guess it by reading a working-days grid yourself):\n"
      + calendarFacts.map((f) => {
        if (!f.is_holiday) {
          const why = f.source === "notice_override"
            ? ` (holiday rescheduled / declared working day per official notice — "${f.notice_title}"${f.notice_summary ? `: ${f.notice_summary}` : ""})`
            : " (no declared holiday on record)";
          return `- ${f.dateLabel}: working day${why}.`;
        }
        const why = f.source === "notice_override"
          ? `per an official notice — "${f.notice_title}"${f.notice_summary ? `: ${f.notice_summary}` : ""}`
          : f.occasion_name
            ? `for ${f.occasion_name}`
            : "no occasion name on record";
        return `- ${f.dateLabel}: HOLIDAY, ${why}.`;
      }).join("\n")
    : "";

  const context = matches.map((m, index) => {
    let tags = "";
    const rawTags = m.metadata?.interests ?? m.metadata?.skills ?? m.metadata?.tags;
    if (Array.isArray(rawTags)) {
      tags = `\n  Tags: ${rawTags.filter((t) => typeof t === "string").join(", ")}`;
    }
    const excerpt = m.body ? `\n  Content/Excerpt: ${m.body.slice(0, 1500)}` : "";
    // Note: We use index + 1 as the implicit citation ID for the model to reference
    return `[${index + 1}] [${m.entity_type.toUpperCase()}] ${m.title} (${m.subtitle ?? ""}) (id: ${m.entity_id}, path: ${m.source_path})${tags}${excerpt}`;
  }).join("\n\n");

  return `You are the AI Campus Overview engine for Friendly Learning at SRM University-AP.
The user searched for: "${query}".

TEMPORAL ANCHOR (Indian Standard Time / Asia/Kolkata):
- Today's Date: ${todayText}
- Current Time Right Now: ${currentTimeText} IST
- Tomorrow's Date: ${tomorrowText}
- Current Academic Year: 2026-27${resolvedFactsBlock}

Here are the most relevant campus resources we found (faculty, mentors, opportunities, groups, posts, official campus documents & policies):
${context ? context : "No matching campus resources found."}

Based strictly on the provided resources, generate a short summary overview (1-2 paragraphs) to help the student.

Rules:
1. TEMPORAL & ACADEMIC CALENDAR RESOLUTION:
   - If a RESOLVED_FACTS block is present above, that answer is ground truth — use it directly and do not re-derive or contradict it. It already tells you whether the date is a holiday and, if so, why.
   - If no RESOLVED_FACTS block is present, resolve the date(s) the student is asking about relative to the TEMPORAL ANCHOR above (e.g. "today" = Today's Date, "tomorrow" = Tomorrow's Date), then check the Academic Calendar working days table: find the row/column matching that resolved date's month and weekday. Any cell marked 'H' indicates an official declared Holiday / Non-Instructional Day with NO classes.
   - State clearly whether the resolved date is a Holiday or a working day, citing the source [1]. Never assume or invent which date is "today" or "tomorrow" — always use the TEMPORAL ANCHOR values above.
2. TIME-OF-DAY WINDOWS: If a resource states a rule that only applies within a specific clock-time window (e.g. "General Outpass: 8:00 AM – 12:00 PM"), compare that window against "Current Time Right Now" in the TEMPORAL ANCHOR before answering whether the student can act on it now. A holiday being in effect does not by itself mean a time-gated action is currently available — check both the date condition AND the time condition, and state plainly if the window has already closed or hasn't opened yet today.
3. GENERAL / COMMON-KNOWLEDGE QUESTIONS: If the question is basic general knowledge, arithmetic, or small talk that has nothing specifically to do with SRM AP (e.g. "what is 2+2", "who is the prime minister of india", "hi", "thanks") — just answer it directly, correctly, and warmly, the way any helpful assistant would, and stop there. Retrieved resources below may include faculty or documents that matched on a loose keyword (e.g. "Mathematics" faculty matching a "2+2" query) — that is a coincidence, not a real answer to the question, so leave 'citations' and 'badges' as empty arrays for these unless the student is actually asking to be connected with a person or resource. An unrelated citation is worse than none; do not pad a correct one-line answer with a department recommendation nobody asked for.
4. Provide DIRECT, SPECIFIC, AND ACCURATE ANSWERS extracted from the content/excerpts. If the user asks for dates, exam timelines, specific penalties, rules, or contacts, STATE THE EXACT DATES AND DETAILS in the summary (with bold formatting) instead of just telling the student to check the document.
5. Synthesize the context in a natural, helpful, student-friendly tone. Do not just list the titles.
6. For anything specific to SRM AP — people, policies, procedures, dates, fees, contacts — only state facts that are actually in the provided context; never invent one. If no campus context matches an SRM-AP-specific question, say there are no direct matches yet and suggest broad advice. (This grounding requirement does not apply to rule 3's general-knowledge questions — you already know those answers.)
7. INLINE CITATIONS: When you state an SRM-AP-specific fact, date, or entity from the resources, include an inline citation bracket like [1] or [2] matching the resource number above.
8. INSTANT VERDICT: In 'verdict', provide an ultra-short 3-8 word headline status verdict (e.g. "🏖️ Official Holiday — No Classes", "📅 Next Exams: 28 Sept – 1 Oct 2026", "👥 8 Fullstack Mentors Available", "🏛️ Hostels Curfew: 9:30 PM", "🧮 2 + 2 = 4").
9. KEY TAKEAWAYS: Extract 1-3 distinct, concise bullet takeaways in 'keyInsights' with bold emoji/category prefixes (e.g., "**📅 Exact Date:** ...", "**🏛️ Library Access:** ...", "**⚠️ Policy:** ..."). Do NOT simply repeat the exact same sentence as the summary; make them actionable, scannable bullet points. For a rule-3 general-knowledge question this array may be empty or omitted.
10. Identify the top 1-4 specific entities to recommend as badges — only ones that are genuinely relevant to the question. Use the exact 'id', 'type', 'title' (for name), 'path' (for to), and 'subtitle' (for detail) from the context. Only use types: 'faculty', 'mentor', 'opportunity', 'community', 'post', or 'document'.
11. CITATIONS MAP: Provide a 'citations' array mapping the numbers you used in the summary to the entity.

Your response MUST be a valid JSON object matching this schema exactly:
{
  "verdict": "🏖️ Official University Holiday (Odd Semester)",
  "summary": "Synthesized text using markdown formatting with inline citations like [1]...",
  "citations": [
    { "id": 1, "text": "Name of the person/resource", "url": "/path/to/resource" }
  ],
  "keyInsights": ["**📅 Exact Date:** Friday, 21 August 2026...", "**🏛️ Library:** Day boarders can enter..."],
  "actionRecommendation": "Tip: ...",
  "badges": [
    {
       "id": "entity_id",
       "name": "title",
       "type": "faculty",
       "to": "source_path",
       "detail": "subtitle or short detail"
    }
  ]
}
Note: For document badges, set type to "document".`;
}

const GENERATION_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.7-flash",
];

const RETRY_503_MS = 600;

function cleanJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

async function generateOverview(prompt: string) {
  const tried: string[] = [];
  const keys = getPrioritizedGeminiKeys();

  for (let keyIdx = 0; keyIdx < keys.length; keyIdx++) {
    const key = keys[keyIdx];
    let keyHit429 = false;

    for (const model of GENERATION_MODELS) {
      const call = () => fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1500,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      let response = await call();

      if (response.status === 503) {
        markGeminiKeyCooldown(key, 503);
        await new Promise((resolve) => setTimeout(resolve, RETRY_503_MS));
        response = await call();
      }

      // If rate-limited (429) on this key, failover immediately to next key in pool
      if (response.status === 429) {
        markGeminiKeyCooldown(key, 429);
        keyHit429 = true;
        tried.push(`key_${keyIdx + 1}:${model}=429_rate_limit`);
        break; // Switch to next key
      }

      if (!response.ok) {
        tried.push(`key_${keyIdx + 1}:${model}=${response.status}`);
        continue;
      }

      const body = await response.json();
      const candidate = body.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (text && candidate?.finishReason === "MAX_TOKENS") {
        tried.push(`key_${keyIdx + 1}:${model}=truncated`);
        continue;
      }
      
      if (text) {
        const cleaned = cleanJsonText(text);
        try {
          const parsed = JSON.parse(cleaned);
          markGeminiKeySuccess(key);
          return parsed;
        } catch (e) {
          tried.push(`key_${keyIdx + 1}:${model}=json-parse-error:${e instanceof Error ? e.message : String(e)}`);
          continue;
        }
      }

      tried.push(`key_${keyIdx + 1}:${model}=empty`);
    }
    if (keyHit429) continue;
  }

  throw new Error(`Gemini API failed across all keys and models: ${tried.join(" | ")}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    if (body.listModels) {
      const keys = getPrioritizedGeminiKeys();
      const activeKey = keys[0] || "";
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${activeKey}&pageSize=200`);
      const data = await res.json();
      const generationModels = (data.models ?? [])
        .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m: any) => m.name);
      return new Response(JSON.stringify({ generationModels }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query } = body;
    
    if (!query || query.trim().length < 3) {
      return new Response(JSON.stringify({ error: "Query too short" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [matches, calendarFacts] = await Promise.all([retrieve(query), resolveCalendarFacts(query)]);
    const overview = await generateOverview(buildPrompt(query, matches, calendarFacts));

    // Ensure all inline citations mentioned in summary (e.g. [1], [3]) are mapped in overview.citations
    if (overview && overview.summary) {
      const citedIds = Array.from(new Set(
        (overview.summary.match(/\[(\d+)\]/g) || [])
          .map((s: string) => parseInt(s.replace(/\D/g, ""), 10))
          .filter((n: number) => !isNaN(n) && n >= 1 && n <= matches.length)
      ));

      const citationMap = new Map<number, { id: number; text: string; url: string }>();
      (overview.citations || []).forEach((c: any) => {
        if (c && c.id) citationMap.set(c.id, c);
      });

      citedIds.forEach((id: number) => {
        if (!citationMap.has(id)) {
          const match = matches[id - 1];
          if (match) {
            citationMap.set(id, {
              id,
              text: match.title,
              url: match.source_path,
            });
          }
        }
      });

      overview.citations = Array.from(citationMap.values()).sort((a, b) => a.id - b.id);
    }

    return new Response(JSON.stringify(overview), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("generate-ai-overview failed:", detail);
    return new Response(
      JSON.stringify({ error: "Failed to generate AI overview", detail }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
