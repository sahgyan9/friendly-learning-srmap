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
const GEMINI_KEY = Deno.env.get("Gemini_API_Key") ?? "";

/**
 * Tried in order until one answers. Not defensive programming for its own sake:
 * this project has already had a pinned model disappear (`text-embedding-004`
 * 404s on the current key despite being the documented name), and a retired
 * model would otherwise take the assistant down silently.
 */
const GENERATION_MODELS = [
  Deno.env.get("CHAT_MODEL"),
  "gemini-2.0-flash",
  "gemini-flash-latest",
  "gemini-2.0-flash-001",
].filter(Boolean) as string[];

const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

type Retrieved = {
  entity_id: string;
  title: string;
  subtitle: string | null;
  metadata: Record<string, unknown>;
  source_path: string;
  similarity: number;
};

function tagsOf(row: Retrieved): string[] {
  const raw = row.metadata?.interests ?? row.metadata?.skills;
  return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
}

/** One retrieval definition for the whole platform, cache included. */
async function retrieve(query: string): Promise<{ faculty: Retrieved[]; mentors: Retrieved[] }> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 8 }),
    });

    if (!response.ok) return { faculty: [], mentors: [] };

    const body = await response.json();
    return { faculty: body.faculty ?? [], mentors: body.mentors ?? [] };
  } catch (error) {
    // A retrieval failure degrades the answer; it must not fail the whole reply.
    console.error("retrieval failed:", error);
    return { faculty: [], mentors: [] };
  }
}

async function generate(prompt: string): Promise<{ text: string; model: string }> {
  const tried: string[] = [];

  for (const model of GENERATION_MODELS) {
    // Reasoning models bill thinking tokens against maxOutputTokens, which cut
    // an early reply off mid-sentence at ~40 words. The obvious fix —
    // thinkingConfig: { thinkingBudget: 0 } — is a trap: `gemini-flash-latest`
    // rejects it with 400 INVALID_ARGUMENT on v1beta, so it broke the one model
    // still answering. A generous ceiling plus the MAX_TOKENS guard below
    // handles it without depending on a parameter a model may not accept.
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 3000, topP: 0.9 },
        }),
      },
    );

    // Any failure falls through to the next candidate rather than throwing.
    // Throwing on the first non-404 made a transient 429 on one model take the
    // whole assistant down even though a later model would have answered.
    if (!response.ok) {
      tried.push(`${model}=${response.status}:${(await response.text()).slice(0, 120)}`);
      continue;
    }

    const body = await response.json();
    const candidate = body.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    // A MAX_TOKENS finish means the student would see half a sentence. Better to
    // fall through to another model than to ship a truncated reply.
    if (text && candidate?.finishReason === "MAX_TOKENS") {
      tried.push(`${model}=truncated-at-${text.length}-chars`);
      continue;
    }
    if (text) return { text: text.trim(), model };

    // An empty candidate means a safety block or an exhausted token budget;
    // both are worth naming in the debug trail rather than looking like a 404.
    tried.push(`${model}=empty:${JSON.stringify(body).slice(0, 150)}`);
  }

  throw new Error(`no usable generation model. ${tried.join(" | ")}`);
}

/**
 * The grounding rules are the safety boundary, not styling. These are named
 * employees of a real university and named students; the model may summarise
 * what is on file and nothing else.
 */
function buildPrompt(message: string, faculty: Retrieved[], mentors: Retrieved[]): string {
  const describe = (row: Retrieved, kind: string) => {
    const tags = tagsOf(row);
    return `- ${row.title} (${kind}${row.subtitle ? `, ${row.subtitle}` : ""})` +
      (tags.length ? `\n  Listed ${kind === "faculty" ? "research interests" : "skills"}: ${tags.join(", ")}` : "");
  };

  const people = [
    ...faculty.map((f) => describe(f, "faculty")),
    ...mentors.map((m) => describe(m, "senior student")),
  ].join("\n");

  return `You are the assistant for Friendly Learning, a student-built platform at SRM University-AP that connects first-year students to senior mentors and to faculty.

A student asked: "${message}"

${people ? `These people were retrieved from the platform's database as topical matches:\n${people}` : "No people in the database matched this question."}

Rules you must follow:
1. Only describe a person using the interests or skills listed above. Do not add biography, opinions, achievements, seniority, or quality judgements — you do not know them.
2. Never invent a name. If nobody is listed above, say the directory has no match yet and give general advice instead.
3. Do not rank people by how good they are. They are ordered by topical match only.
4. Do not mention grades, ratings, or how easy a professor is.
5. Be warm and brief — you are talking to a nervous first-year. 120 words or fewer.
6. Do not repeat the list verbatim; it is already shown to the student as cards beside your reply. Refer to it naturally.

Answer the student's question directly.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const currentSessionId = crypto.randomUUID();

  try {
    const { message, sessionId, userId } = await req.json();
    if (!message) throw new Error("No message provided");

    const session = sessionId || currentSessionId;

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

    const { faculty, mentors } = await retrieve(message);

    // The suggestion cards read full mentor rows (skills.slice, rating.toFixed),
    // so the retrieved IDs are rehydrated rather than passed through as chunks.
    // Nulls here would crash the card, hence the defaults.
    let suggestedMentors: unknown[] = [];
    if (mentors.length) {
      const { data } = await supabase
        .from("mentors")
        .select("id, name, department, skills, rating, profile_image, bio")
        .in("id", mentors.map((m) => m.entity_id));

      const order = new Map(mentors.map((m, index) => [m.entity_id, index]));
      suggestedMentors = (data ?? [])
        .map((row) => ({
          ...row,
          skills: row.skills ?? [],
          rating: row.rating ?? 0,
          relevanceScore: mentors.find((m) => m.entity_id === row.id)?.similarity ?? 0,
        }))
        // Keep the retrieval ranking; the IN query returns arbitrary order.
        .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    const shownFaculty = faculty.slice(0, 4);
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

    // Only the people whose cards are rendered may be named in the prose.
    // Eight are retrieved but four faculty are shown, and the model happily
    // named a fifth — not a hallucination (it was retrieved) but the student
    // sees a name with no card beside it, which reads exactly like one.
    const { text: aiResponse, model: usedModel } = await generate(
      buildPrompt(message, shownFaculty, mentors),
    );

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

    return new Response(
      JSON.stringify({
        ...(debug ? { debug: detail } : {}),
        aiResponse:
          "I hit a problem answering that. Try again in a moment — or browse /ask, which searches faculty and seniors directly.",
        suggestedMentors: [],
        suggestedFaculty: [],
        hasMentorSuggestions: false,
        hasFacultySuggestions: false,
        sessionId: currentSessionId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
