import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const GEMINI_KEY = Deno.env.get("Gemini_API_Key") ?? "";
const MODEL = "gemini-1.5-flash";

type Retrieved = {
  entity_type: string;
  entity_id: string;
  title: string;
  subtitle: string | null;
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
  const context = matches.map((m) => {
    let tags = "";
    const rawTags = m.metadata?.interests ?? m.metadata?.skills ?? m.metadata?.tags;
    if (Array.isArray(rawTags)) {
      tags = `\n  Tags: ${rawTags.filter((t) => typeof t === "string").join(", ")}`;
    }
    return `- [${m.entity_type.toUpperCase()}] ${m.title} (${m.subtitle ?? ""}) (id: ${m.entity_id}, path: ${m.source_path})${tags}`;
  }).join("\n");

  return `You are the AI Campus Overview engine for Friendly Learning at SRM University-AP.
The user searched for: "${query}".

Here are the most relevant campus resources we found (faculty, mentors, opportunities, groups, posts):
${context ? context : "No matching campus resources found."}

Based strictly on the provided resources, generate a short summary overview (1-2 paragraphs) to help the student.

Rules:
1. Synthesize the context in a natural, helpful, student-friendly tone. Do not just list the titles.
2. Only mention people, events, or entities from the provided context. If no context is provided, say there are no direct matches yet and suggest broad advice.
3. Suggest an action recommendation (e.g., "Tip: Check out this hackathon or contact Dr. X").
4. Extract 1-3 key insights as a list of short strings.
5. Identify the top 1-4 specific entities to recommend as badges. Use the exact 'id', 'type', 'title' (for name), 'path' (for to), and 'subtitle' (for detail) from the context. Only use types: 'faculty', 'mentor', 'opportunity', 'community', or 'post'.

Your response MUST be a valid JSON object matching this schema exactly:
{
  "summary": "Synthesized text using markdown formatting (like **bolding** key terms)...",
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
}`;
}

async function generateOverview(prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini API failed (${response.status}): ${text.slice(0, 200)}`);
  }

  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!text) {
    throw new Error("Empty response from model");
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Failed to parse JSON response");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    
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
    console.error("generate-ai-overview failed:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate AI overview" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
