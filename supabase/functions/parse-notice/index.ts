// Turns a pasted circular (text or a photo of one) into the structured fields
// public.campus_notices expects, so the admin gets a pre-filled form instead
// of a blob of text to reformat by hand.
//
// Deliberately separate from parse-doc-ocr: that function returns free-text
// Markdown for a specific hardcoded document (the Student Code of Conduct)
// and is reused as-is by tools/process_university_data.py. This function
// asks Gemini for JSON instead, and is admin-only (parse-doc-ocr accepts any
// authenticated user, which was fine for its one existing caller).
//
// AUTH: no CRON_SECRET path — this is only ever called from the admin
// Notices page with a real admin JWT, so verify_jwt stays at the platform
// default (true) and this function does its own admin check on top, the
// same defense-in-depth shape as every other privileged edge function here.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

import {
  getPrioritizedGeminiKeys,
  markGeminiKeyCooldown,
  markGeminiKeySuccess,
} from "../_shared/gemini-pool.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const CANDIDATE_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
];

const NOTICE_CATEGORIES = ["holiday_change", "academic_calendar", "exam", "event", "administrative", "general"];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Short, specific title for the notice" },
    category: { type: "STRING", enum: NOTICE_CATEGORIES },
    reference_no: { type: "STRING", description: "Circular/reference number, or empty string if none" },
    issued_date: { type: "STRING", description: "Date the circular was issued, as YYYY-MM-DD" },
    effective_date: { type: "STRING", description: "Date the notice takes effect (e.g. the new holiday date), as YYYY-MM-DD, or empty string if not applicable" },
    superseded_date: { type: "STRING", description: "Original date the holiday/event moved away from (if rescheduled), as YYYY-MM-DD, or empty string if not applicable" },
    summary: { type: "STRING", description: "One-sentence plain-English summary" },
    content: { type: "STRING", description: "The full body of the notice, cleaned up, as plain text or simple Markdown" },
  },
  required: ["title", "category", "issued_date", "summary", "content"],
};

function buildPrompt(): string {
  return `You are transcribing an official SRM University-AP circular/notice for a student portal's admin tool.
Extract these fields as JSON matching the provided schema:
- title: a short, specific title (do not just repeat "Circular")
- category: pick the closest match from ${NOTICE_CATEGORIES.join(", ")} — default to "general" if unsure
- reference_no: the circular/reference number exactly as written (e.g. "SRMAP/Reg. Off/Circular/02/2026-27"), or "" if none is present
- issued_date: the date the circular was issued/signed, normalized to YYYY-MM-DD. Convert ordinal dates like "20th August 2026" to "2026-08-20".
- effective_date: the single most relevant date the notice is ABOUT (e.g. the actual holiday date, the rescheduled date it moved TO), normalized to YYYY-MM-DD, or "" if the notice has no specific effective date
- superseded_date: if this circular reschedules or moves a holiday from a prior date, extract that original date it moved FROM, normalized to YYYY-MM-DD (e.g. "moved from 25th August 2026" -> "2026-08-25"), or "" if not a reschedule
- summary: one plain-English sentence a student would understand at a glance
- content: the full body, cleaned of OCR artifacts, as plain text or simple Markdown. Preserve all dates, section references, and numbers exactly. Do not add commentary not present in the source.
Return ONLY the JSON object.`;
}

async function isAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const { data, error } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (error || !data?.user) return false;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile?.is_admin === true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const geminiKeys = getPrioritizedGeminiKeys();
  if (geminiKeys.length === 0) return json({ error: "Gemini API Key is not configured" }, 500);

  if (!(await isAdmin(req))) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { mode?: "text" | "image"; text?: string; imageBase64?: string; mimeType?: string } = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { mode, text, imageBase64, mimeType = "image/jpeg" } = payload;

  let parts: Record<string, unknown>[];
  if (mode === "text") {
    if (!text?.trim()) return json({ error: "text is required for mode: text" }, 400);
    parts = [{ text: `${buildPrompt()}\n\nSOURCE TEXT:\n${text}` }];
  } else if (mode === "image") {
    if (!imageBase64) return json({ error: "imageBase64 is required for mode: image" }, 400);
    parts = [{ text: buildPrompt() }, { inlineData: { mimeType, data: imageBase64 } }];
  } else {
    return json({ error: 'mode must be "text" or "image"' }, 400);
  }

  let lastError = "";
  for (const key of geminiKeys) {
    let keyHit429 = false;
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 3000,
                responseMimeType: "application/json",
                responseSchema: RESPONSE_SCHEMA,
              },
            }),
          },
        );

        if (response.status === 429) {
          markGeminiKeyCooldown(key, 429);
          keyHit429 = true;
          lastError = `${model} -> 429 rate limit`;
          break; // Switch to next key in pool
        }

        if (!response.ok) {
          lastError = `${model} -> ${response.status}: ${(await response.text()).slice(0, 200)}`;
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(rawText);
        } catch {
          lastError = `${model} -> model returned non-JSON output`;
          continue;
        }

        markGeminiKeySuccess(key);
        return json({
          model,
          title: parsed.title ?? "",
          category: NOTICE_CATEGORIES.includes(parsed.category as string) ? parsed.category : "general",
          reference_no: parsed.reference_no ?? "",
          issued_date: parsed.issued_date ?? "",
          effective_date: parsed.effective_date ?? "",
          superseded_date: parsed.superseded_date ?? "",
          summary: parsed.summary ?? "",
          content: parsed.content ?? "",
        });
      } catch (err) {
        lastError = `${model} -> ${err instanceof Error ? err.message : String(err)}`;
      }
    }
    if (keyHit429) continue;
  }

  return json({ error: `All candidate models failed. Last error: ${lastError}` }, 500);
});
