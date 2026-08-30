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

// Models verified on Google Gemini Developer API
const CANDIDATE_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
];

const MAX_OUTPUT_TOKENS_FULL = 4096;
const MAX_OUTPUT_TOKENS_BASIC = 2048;
const RETRY_503_MS = 1200;
const ATTEMPT_TIMEOUT_MS = 20000;

const MAX_BASE64_LEN = 14 * 1024 * 1024;
const MAX_TEXT_LEN = 20000;

const EXTRA_FIELDS_BLOCK = `- "tagline": string (a punchy, natural one-sentence headline under 100 chars describing their domain, skills, or focus, e.g. "CSE student helping with C++, data structures, and competitive programming." or "Physics student working on quantum computing and renewable energy." or "Full-stack developer with React and cloud infrastructure experience.")
- "outcomes": array of 2 to 3 concise strings describing concrete things a junior/peer achieves with their help (e.g. ["Build and deploy fullstack React projects", "Master problem-solving in physics and calculus"])
- "ask_me_anything": array of 3 to 4 distinct topic strings (e.g. ["Quantum Algorithms", "React Development", "Research Paper Writing", "Lab Reports"])
- "ideal_mentees": array of 2 to 3 concise strings describing who gets the most value (e.g. ["1st or 2nd year students taking Physics courses", "Classmates looking for hackathon teammates"])
- "projects": array of max 4 objects representing projects found in the resume, with keys: "title" (string, project title, max 60 chars), "description" (string, 1-2 sentences on what was built and key tech used, max 180 chars), "link" (string, URL if mentioned in resume, or "")
- "experiences": array of max 4 objects representing work/internship/leadership experience or positions of responsibility found in the resume, with keys: "title" (string, role or position title, max 60 chars), "organization" (string, company, lab, club, or organization name, max 60 chars), "period" (string, e.g. "Summer 2024" or "2023 - 2024", or "")
`;

function buildPrompt(fields: "basic" | "full"): string {
  const currentDateStr = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  return `You are an expert resume parser for a university peer learning & mentorship platform. Extract structured information from this student's PDF (which may be a LinkedIn profile export or a standard resume/CV).
Today's date is ${currentDateStr} (Academic year ${currentYear}-${currentYear + 1}).

Return a valid JSON object with these exact keys:
- "name": string (full student name)
- "department": string (field of study or major, e.g. "Physics", "Computer Science and Engineering")
- "university": string (e.g. "SRM University-AP")
- "year_of_studies": string (Compute the student's current academic year from their degree dates relative to today's date ${currentDateStr}. Note: For an intake of 2023 graduating in 2027, 2023-2024 is 1st Year, 2024-2025 is 2nd Year, 2025-2026 is 3rd Year, and in the 2026-2027 academic session they are in their "4th Year". Must be one of: "1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduated", or "")
- "skills": string (comma-separated list of max 15 distinct technical, scientific, or domain skills, e.g. "Python, Quantum Mechanics, React, MATLAB". CRITICAL CONSTRAINT: DO NOT include degrees, diplomas, program names, specializations, or academic titles like "B.S. IT", "B.Tech", "M.Sc.", "Specialising in...", "SRM University", "Student" in the skills list)
${fields === "full" ? EXTRA_FIELDS_BLOCK : ""}- "bio": string (concise 2-3 sentence professional summary in first person)
- "linkedin_url": string (full LinkedIn profile URL if visible, or empty)
- "hobbies": string (hobbies or extra-curricular interests if present, or empty)
- "mobile": string (contact number if present, or empty)

If any field cannot be derived from the document, provide an empty string "" or empty array [].`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // Verify caller authentication (valid user session or platform token)
  const authHeader = req.headers.get("Authorization");
  const apikeyHeader = req.headers.get("apikey");
  let isAuthed = false;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseAdmin.auth.getUser(token);
    if (authData?.user) {
      isAuthed = true;
    } else if (
      token === Deno.env.get("SUPABASE_ANON_KEY") ||
      token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ) {
      isAuthed = true;
    }
  }

  if (
    !isAuthed &&
    apikeyHeader &&
    (apikeyHeader === Deno.env.get("SUPABASE_ANON_KEY") ||
      apikeyHeader === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"))
  ) {
    isAuthed = true;
  }

  if (!isAuthed) {
    return json({ error: "Authentication required. Please sign in to upload your resume." }, 401);
  }

  try {
    const { pdfBase64, pdfText, mimeType, fields } = await req.json();

    const hasText = typeof pdfText === "string" && pdfText.trim().length > 0;
    const hasBase64 = typeof pdfBase64 === "string" && pdfBase64.length > 0;
    if (!hasText && !hasBase64) {
      return json({ error: "pdfText or pdfBase64 is required" }, 400);
    }
    if (hasBase64 && pdfBase64.length > MAX_BASE64_LEN) {
      return json({ error: "PDF is too large" }, 400);
    }

    // Text mode vs inlineData fallback
    const documentPart = hasText
      ? { text: `Here is the extracted text content of the student's PDF document:\n"""\n${(pdfText as string).slice(0, MAX_TEXT_LEN)}\n"""` }
      : { inlineData: { mimeType: mimeType || "application/pdf", data: pdfBase64 } };

    const finalMime = mimeType || "application/pdf";
    const fieldsMode: "basic" | "full" = fields === "basic" ? "basic" : "full";
    const prompt = buildPrompt(fieldsMode);
    const maxOutputTokens =
      fieldsMode === "full" ? MAX_OUTPUT_TOKENS_FULL : MAX_OUTPUT_TOKENS_BASIC;

    let lastError = "";

    const fetchWithTimeout = (url: string, init: RequestInit) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
      return fetch(url, { ...init, signal: controller.signal }).finally(() =>
        clearTimeout(timer)
      );
    };

    // 1. Try native Google Gemini API keys first
    if (GEMINI_KEYS.length > 0) {
      for (const key of GEMINI_KEYS) {
        for (const model of CANDIDATE_MODELS) {
          const call = () =>
            fetchWithTimeout(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [
                    {
                      parts: [{ text: prompt }, documentPart],
                    },
                  ],
                  generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens,
                    responseMimeType: "application/json",
                  },
                }),
              }
            );

          try {
            let res = await call();
            if (res.status === 503) {
              await new Promise((r) => setTimeout(r, RETRY_503_MS));
              res = await call();
            }

            if (res.status === 429) {
              lastError = `${model} -> 429 rate limited`;
              break; // Switch to next key
            }

            if (!res.ok) {
              lastError = `${model} -> ${res.status}: ${(await res.text()).slice(0, 150)}`;
              continue;
            }

            const data = await res.json();
            const candidate = data?.candidates?.[0];
            const rawText = candidate?.content?.parts?.[0]?.text;

            if (rawText && candidate?.finishReason === "MAX_TOKENS") {
              lastError = `${model} -> truncated at MAX_TOKENS`;
              continue;
            }

            if (rawText) {
              let cleaned = rawText.trim();
              if (cleaned.startsWith("```json")) {
                cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
              } else if (cleaned.startsWith("```")) {
                cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
              }
              const parsed = JSON.parse(cleaned);
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
        const userContent = hasText
          ? [
              {
                type: "text",
                text: `Extract mentor profile fields from this LinkedIn/resume PDF text:\n\n${(pdfText as string).slice(0, MAX_TEXT_LEN)}`,
              },
            ]
          : [
              { type: "text", text: "Extract mentor profile fields from this LinkedIn PDF." },
              {
                type: "file",
                file: {
                  filename: "linkedin.pdf",
                  file_data: `data:${finalMime};base64,${pdfBase64}`,
                },
              },
            ];

        const aiResponse = await fetchWithTimeout("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-flash-latest",
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: userContent },
            ],
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            let cleaned = content.trim();
            if (cleaned.startsWith("```json")) {
              cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
            } else if (cleaned.startsWith("```")) {
              cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
            }
            const parsed = JSON.parse(cleaned);
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
