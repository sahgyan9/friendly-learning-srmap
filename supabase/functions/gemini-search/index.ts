import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Gemini configuration - using your verified settings
const GEMINI_API_KEY = Deno.env.get('Gemini_API_Key') ?? '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

async function fetchMentors() {
  const { data, error } = await supabaseClient
    .from('mentors')
    .select('*');

  if (error) {
    console.error("Error fetching mentors:", error);
    return [];
  }
  return data || [];
}

async function searchWithGeminiAI(query: string, mentors: any[]) {
  if (!GEMINI_API_KEY) {
    console.error("ERROR: Gemini API key is missing. Check Supabase Secrets.");
    return { error: "API key not configured" };
  }

  try {
    console.log("Calling Gemini API with key:", GEMINI_API_KEY.slice(0, 5) + "...");
    
    // Prepare mentor data for the prompt
    const mentorsContext = mentors.map(mentor => ({
      id: mentor.id,
      name: mentor.name,
      department: mentor.department,
      skills: mentor.skills,
      rating: mentor.rating
    }));

    const prompt = {
      contents: [{
        parts: [{
          text: `Given this query: "${query}", and these mentors (in JSON format): 
          ${JSON.stringify(mentorsContext, null, 2)}
          
          Return ONLY a JSON array of relevant mentor IDs in this exact format:
          [{"id":"..."},{"id":"..."}]
          
          Do not include any explanations or other text.`
        }]
      }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024
      }
    };

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prompt),
    });

    console.log("API Status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      return { error: "API request failed", details: errorText };
    }

    const data = await response.json();
    console.log("API Response:", JSON.stringify(data, null, 2));

    // Extract and parse the response
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!responseText) {
      return { error: "No text in response", raw: data };
    }

    try {
      // First try to parse directly
      const result = JSON.parse(responseText);
      if (Array.isArray(result)) {
        return { ids: result };
      }
      
      // If not array, try to extract JSON
      const jsonMatch = responseText.match(/\[.*\]/s);
      if (jsonMatch) {
        return { ids: JSON.parse(jsonMatch[0]) };
      }
      
      throw new Error("No valid JSON array found in response");
    } catch (e) {
      console.error("Failed to parse response. Raw text:", responseText);
      return { error: "Response parsing failed", raw: responseText };
    }
  } catch (error) {
    console.error("Network Error:", error);
    return { error: "Failed to connect to Gemini", details: error.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Received query: "${query}"`);
    
    // Get mentors
    const mentors = await fetchMentors();
    if (!mentors.length) {
      return new Response(
        JSON.stringify({ error: "No mentors available" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Search with Gemini
    const { ids, error, raw } = await searchWithGeminiAI(query, mentors);
    if (error) {
      return new Response(
        JSON.stringify({ error, details: raw }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Filter and return results
    const mentorIds = ids.map((item: any) => item.id);
    const results = mentors.filter(mentor => mentorIds.includes(mentor.id));
    
    return new Response(
      JSON.stringify({
        query,
        results,
        count: results.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});