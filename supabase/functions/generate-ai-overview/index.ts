import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const GEMINI_KEY = Deno.env.get("Gemini_API_Key") ?? "";
const MODEL = "gemini-flash-latest";

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

// Reuse semantic-search to leverage the query cache and central embedding logic.
async function retrieve(query: string): Promise<Retrieved[]> {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 10 }),
    });

    if (!response.ok) return [];

    const body = await response.json();
    // semantic-search returns grouped results. We flatten them back to a single list.
    const all = [
      ...(body.faculty ?? []),
      ...(body.mentors ?? []),
      ...(body.opportunities ?? []),
      ...(body.communities ?? []),
      ...(body.posts ?? []),
      ...(body.documents ?? []),
      ...(body.other ?? []),
    ] as Retrieved[];

    // Re-sort by similarity since flattening mixes the groups
    return all.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error("retrieval failed:", error);
    return [];
  }
}

function buildPrompt(query: string, matches: Retrieved[]): string {
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

Here are the most relevant campus resources we found (faculty, mentors, opportunities, groups, posts, official campus documents & policies):
${context ? context : "No matching campus resources found."}

Based strictly on the provided resources, generate a short summary overview (1-2 paragraphs) to help the student.

Rules:
1. Provide DIRECT, SPECIFIC, AND ACCURATE ANSWERS extracted from the content/excerpts. If the user asks for dates, exam timelines, specific penalties, rules, or contacts, STATE THE EXACT DATES AND DETAILS in the summary (with bold formatting) instead of just telling the student to check the document.
2. Synthesize the context in a natural, helpful, student-friendly tone. Do not just list the titles.
3. Only mention people, events, facts, or entities from the provided context. If no context is provided, say there are no direct matches yet and suggest broad advice.
4. INLINE CITATIONS: When you state a fact, date, or mention an entity from the resources, you MUST include an inline citation bracket like [1] or [2] matching the resource number above.
5. Extract 1-3 key insights as a list of short strings.
6. Identify the top 1-4 specific entities to recommend as badges. Use the exact 'id', 'type', 'title' (for name), 'path' (for to), and 'subtitle' (for detail) from the context. Only use types: 'faculty', 'mentor', 'opportunity', 'community', 'post', or 'document'.
7. CITATIONS MAP: Provide a 'citations' array mapping the numbers you used in the summary to the entity.

Your response MUST be a valid JSON object matching this schema exactly:
{
  "summary": "Synthesized text using markdown formatting with inline citations like [1]...",
  "citations": [
    { "id": 1, "text": "Name of the person/resource", "url": "/path/to/resource" }
  ],
  "keyInsights": ["Short insight 1...", "Short insight 2..."],
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
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

const RETRY_503_MS = 900;

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

  for (const model of GENERATION_MODELS) {
    const call = () => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 3500,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    let response = await call();

    if (response.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_503_MS));
      response = await call();
    }

    if (!response.ok) {
      tried.push(`${model}=${response.status}:${(await response.text()).slice(0, 120)}`);
      continue;
    }

    const body = await response.json();
    const candidate = body.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (text && candidate?.finishReason === "MAX_TOKENS") {
      tried.push(`${model}=truncated-at-${text.length}-chars`);
      continue;
    }
    
    if (text) {
      const cleaned = cleanJsonText(text);
      try {
        return JSON.parse(cleaned);
      } catch (e) {
        tried.push(`${model}=json-parse-error:${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }

    tried.push(`${model}=empty`);
  }

  throw new Error(`Gemini API failed to generate on all models: ${tried.join(" | ")}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    if (body.listModels) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}&pageSize=200`);
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

    const matches = await retrieve(query);
    const overview = await generateOverview(buildPrompt(query, matches));

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
