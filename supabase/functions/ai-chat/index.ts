
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Gemini API
const GOOGLE_API_KEY = Deno.env.get('Gemini_API_Key') ?? '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-pro:generateContent';

async function fetchMentors(query) {
  try {
    // Fetch all mentors from the DB
    const { data, error } = await supabaseClient
      .from('mentors')
      .select('*');
    if (error) {
      console.error("Error fetching mentors:", error);
      return [];
    }
    if (!data || data.length === 0) return [];

    // Simple skill match first
    const lowerQuery = query.toLowerCase();
    const matched = data.filter(mentor => {
      if (
        mentor.skills.some(skill => skill.toLowerCase().includes(lowerQuery)) ||
        mentor.name.toLowerCase().includes(lowerQuery) ||
        (mentor.bio && mentor.bio.toLowerCase().includes(lowerQuery)) ||
        mentor.department.toLowerCase().includes(lowerQuery)
      ) {
        return true;
      }
      return false;
    });

    return matched.slice(0, 5); // Return up to 5
  } catch (err) {
    console.error("Mentor fetch error:", err);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Missing messages." }), {
        status: 400, headers: corsHeaders
      });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || '';
    // 1. Compose Gemini prompt
    const prompt = `
You are an AI assistant for a mentorship platform. Answer questions as best as Gemini normally would. If the question relates to career, learning, or mentorship, ALSO recommend one or more mentors from the context provided if their expertise is relevant.

Show your answer under "answer" and show any relevant mentor IDs under "mentor_ids" as a JSON array. Example output:
{"answer":"<your answer>","mentor_ids":["id1","id2"]}

Mentor context:
(Mentors are listed as: ID, Name, Department, Skills, Bio)
${
  // Basic, flat context for Gemini LLM
  (await fetchMentors('')).map(m =>
    `ID: ${m.id} | Name: ${m.name} | Dept: ${m.department} | Skills: ${m.skills.join(', ')} | Bio: ${(m.bio||'')}`
  ).join('\n')
}

Question: ${lastUserMsg}
`;

    // 2. Get Gemini answer
    const geminiRes = await fetch(
      `${GEMINI_API_URL}?key=${GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1024, temperature: 0.3 }
        })
      }
    );

    if (!geminiRes.ok) {
      const et = await geminiRes.text();
      console.error('Gemini error:', et);
      return new Response(JSON.stringify({ error: "Gemini API error" }), { status: 500, headers: corsHeaders });
    }

    const geminiData = await geminiRes.json();
    const replyText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Try to parse JSON in response using regex
    let answer = replyText, mentor_ids = [];
    try {
      const jsonMatch = replyText.match(/\{.*\}/s);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        answer = parsed.answer;
        mentor_ids = parsed.mentor_ids || [];
      }
    } catch (err) {}

    // 3. Fetch mentors if any IDs present
    let suggestedMentors = [];
    if (mentor_ids && mentor_ids.length > 0) {
      const { data: allMentors } = await supabaseClient.from('mentors').select('*').in('id', mentor_ids);
      suggestedMentors = allMentors || [];
    }

    return new Response(JSON.stringify({
      answer: answer || replyText || "Sorry, I couldn't process your request.",
      mentors: suggestedMentors
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }});
  } catch (error) {
    console.error("AI chat error:", error);
    return new Response(JSON.stringify({ error: "AI chat error." }), {
      status: 500, headers: corsHeaders
    });
  }
});
