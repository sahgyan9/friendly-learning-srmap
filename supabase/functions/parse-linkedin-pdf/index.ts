// Parse LinkedIn PDF resume and extract structured profile data using Gemini API
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_KEYS = [
  Deno.env.get("Gemini_API_Key"),
  Deno.env.get("Gemini_API_Key_2"),
  Deno.env.get("GEMINI_API_KEY"),
].filter((k): k is string => Boolean(k && k.trim().length > 0));

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.7-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Verify caller authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData?.user) {
    return json({ error: "Invalid or expired session" }, 401);
  }

  try {
    const { pdfBase64, mimeType } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return json({ error: "pdfBase64 is required" }, 400);
    }

    const finalMime = mimeType || "application/pdf";

    const prompt = `You are an expert resume parser for a university peer learning & mentorship platform. Extract structured information from this student's PDF (which may be a LinkedIn profile export or a standard resume/CV).
Return a valid JSON object with these exact keys:
- "name": string (full student name)
- "department": string (field of study or major, e.g. "Physics", "Computer Science and Engineering")
- "university": string (e.g. "SRM University-AP")
- "year_of_studies": string (must be one of: "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduated", or "")
- "skills": string (comma-separated list of max 15 distinct technical, scientific, or domain skills, e.g. "Python, Quantum Mechanics, React, MATLAB". CRITICAL CONSTRAINT: DO NOT include degrees, diplomas, program names, specializations, or academic titles like "B.S. IT", "B.Tech", "M.Sc.", "Specialising in...", "SRM University", "Student" in the skills list)
- "tagline": string (a punchy one-sentence headline under 100 chars on what this student can help peers with, e.g. "Helping peers master Quantum Mechanics & Full-stack React apps")
- "outcomes": array of 2 to 3 concise strings describing concrete things a junior/peer achieves with their help (e.g. ["Build and deploy fullstack React projects", "Master problem-solving in physics and calculus"])
- "ask_me_anything": array of 3 to 4 distinct topic strings (e.g. ["Quantum Algorithms", "React Development", "Research Paper Writing", "Lab Reports"])
- "ideal_mentees": array of 2 to 3 concise strings describing who gets the most value (e.g. ["1st or 2nd year students taking Physics courses", "Classmates looking for hackathon teammates"])
- "bio": string (concise 2-3 sentence professional summary in first person)
- "linkedin_url": string (full LinkedIn profile URL if visible, or empty)
- "hobbies": string (hobbies or extra-curricular interests if present, or empty)
- "mobile": string (contact number if present, or empty)

If any field cannot be derived from the document, provide an empty string "" or empty array [].`;

    let lastError = "";

    // 1. Try native Google Gemini API keys first
    if (GEMINI_KEYS.length > 0) {
      for (const key of GEMINI_KEYS) {
        for (const model of CANDIDATE_MODELS) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
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
                            mimeType: finalMime,
                            data: pdfBase64,
                          },
                        },
                      ],
                    },
                  ],
                  generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json",
                  },
                }),
              }
            );

            if (res.status === 429) {
              lastError = `${model} -> 429 rate limited`;
              break; // Switch to next key
            }

            if (!res.ok) {
              lastError = `${model} -> ${res.status}: ${(await res.text()).slice(0, 150)}`;
              continue;
            }

            const data = await res.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              const parsed = JSON.parse(rawText);
              return json({ data: parsed });
            }
          } catch (err) {
            lastError = `${model} -> ${err instanceof Error ? err.message : String(err)}`;
          }
        }
      }
    }

    // 2. Fallback to Lovable Gateway if available
    if (LOVABLE_API_KEY) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: prompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "Extract mentor profile fields from this LinkedIn PDF." },
                  {
                    type: "file",
                    file: {
                      filename: "linkedin.pdf",
                      file_data: `data:${finalMime};base64,${pdfBase64}`,
                    },
                  },
                ],
              },
            ],
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return json({ data: parsed });
          }
        }
      } catch (gatewayErr) {
        console.error("Lovable gateway fallback error:", gatewayErr);
      }
    }

    return json({ error: `Could not parse PDF. ${lastError}` }, 500);
  } catch (e) {
    console.error("parse-linkedin-pdf error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
