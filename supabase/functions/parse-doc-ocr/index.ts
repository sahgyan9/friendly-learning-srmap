import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_KEY = Deno.env.get("Gemini_API_Key") ?? "";

const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!GEMINI_KEY) return json({ error: "Gemini_API_Key is not configured" }, 500);

  let payload: { imageBase64?: string; mimeType?: string; pageNum?: number; listModels?: boolean } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (payload.listModels) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}&pageSize=200`);
    const data = await res.json();
    return json(data);
  }

  const { imageBase64, mimeType = "image/png", pageNum } = payload;
  if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);

  const prompt = `You are a precision document transcription engine.
Transcribe this page from SRM University-AP Student Code of Conduct into clear, structured Markdown.
Rules:
1. Retain all section numbers, headings, sub-clauses, and tables exactly as written.
2. Fix any obvious OCR artifacts so words and legal definitions are clean and complete.
3. Do not add conversational commentary or preamble. Return ONLY the transcribed text.
4. If there is a table, format it as a clean Markdown table.
5. If there are numbered or lettered points, preserve the hierarchy.`;

  let lastError = "";
  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType,
                      data: imageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 3000,
            },
          }),
        }
      );

      if (!response.ok) {
        lastError = `${model} -> ${response.status}: ${(await response.text()).slice(0, 200)}`;
        continue;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      return json({ pageNum, model, text });
    } catch (err) {
      lastError = `${model} -> ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return json({ error: `All candidate models failed. Last error: ${lastError}` }, 500);
});
