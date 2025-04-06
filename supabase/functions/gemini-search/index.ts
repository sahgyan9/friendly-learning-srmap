import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize the Supabase client with credentials from the environment
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// The Google API key and Gemini API URL
const GOOGLE_API_KEY = Deno.env.get('Gemini_API_Key') ?? '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Helper function to fetch mentors from Supabase
async function fetchMentors() {
  console.log("Fetching mentors from Supabase database...");

  const { data, error } = await supabaseClient
    .from('mentors')
    .select('*');

  if (error) {
    console.error("Error fetching mentors from database:", error);
    return [];
  }

  console.log(`Successfully fetched ${data?.length || 0} mentors from Supabase`);
  return data || [];
}

// Helper function to use Gemini to analyze query and find mentors
async function searchWithGeminiAI(query: string, mentors: any[]) {
  if (!GOOGLE_API_KEY) {
    console.error("Google API key is not set");
    return { error: "AI search is not configured correctly (missing API key)." };
  }

  if (mentors.length === 0) {
    console.log("No mentors provided to searchWithGeminiAI");
    return { ids: [] };
  }

  try {
    const mentorsContext = mentors.map(mentor => {
      return `ID: ${mentor.id}, Name: ${mentor.name}, Dept: ${mentor.department}, Skills: ${mentor.skills.join(', ')}, Bio: ${mentor.bio?.substring(0, 100) || 'N/A'}`;
    }).join('\n');

    const prompt = `
      Analyze the user query "${query}" based ONLY on the following mentor context.
      Return ONLY a valid JSON array containing objects, where each object has a single key "id" with the string value of the relevant mentor's ID. Rank by relevance.
      Example response format: [{"id":"123"},{"id":"45"}]
      DO NOT include any introductory text, explanations, apologies, or markdown formatting like \`\`\`json. Just the JSON array.
      
      Mentor Context:
      ${mentorsContext}
    `;

    console.log(`Sending prompt to Gemini (context length: ${mentorsContext.length})`);

    const response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API fetch error:", response.status, errorText);
      return { error: `Gemini API request failed with status ${response.status}` };
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    console.log("Trimmed Gemini response text:", responseText);

    try {
      if (!responseText.startsWith('[') || !responseText.endsWith(']')) {
        console.error("Gemini response does not appear to be a JSON array:", responseText);
        const jsonMatch = responseText.match(/[.*?]/s);
        if (jsonMatch && jsonMatch[0]) {
          console.log("Attempting to parse extracted JSON:", jsonMatch[0]);
          const mentorIds = JSON.parse(jsonMatch[0]);
          console.log("Parsed Mentor IDs from extraction:", mentorIds.map((item: any) => item?.id).filter(Boolean));
          return { ids: mentorIds.filter((item: any) => item && typeof item.id === 'string') };
        } else {
          return { error: "Could not extract valid JSON array from Gemini response", raw: responseText };
        }
      }

      const mentorIds = JSON.parse(responseText);

      if (!Array.isArray(mentorIds) || !mentorIds.every(item => item && typeof item.id === 'string')) {
        console.error("Parsed JSON is not in the expected format [{\"id\":\"...\"}]:", mentorIds);
        return { error: "Gemini returned data in an unexpected format.", raw: responseText };
      }

      console.log("Successfully Parsed Mentor IDs:", mentorIds.map(item => item.id));
      return { ids: mentorIds };
    } catch (err) {
      console.error("Error parsing JSON from Gemini response:", err, "\nRaw Text:", responseText);
      return { error: "Failed to parse Gemini response JSON", raw: responseText };
    }
  } catch (error) {
    console.error("Unexpected error in searchWithGeminiAI:", error);
    return { error: "An unexpected error occurred during the AI search." };
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { query } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid query parameter" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Received search query: "${query}"`);

    // Fetch mentors from Supabase
    const mentors = await fetchMentors();

    // If no mentors in database, return error
    if (mentors.length === 0) {
      return new Response(
        JSON.stringify({ error: "No mentors found in database" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Use Gemini to search through mentors
    const geminiResult = await searchWithGeminiAI(query, mentors);

    if (geminiResult.error) {
      return new Response(
        JSON.stringify({ error: geminiResult.error, raw: geminiResult.raw }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get the full mentor objects for the returned IDs
    const mentorIds = geminiResult.ids.map((item: any) => item.id);
    console.log("Mentor IDs from Gemini:", mentorIds);

    const filteredMentors = mentors.filter((mentor) =>
      mentorIds.includes(mentor.id)
    );

    // Return the results
    return new Response(
      JSON.stringify({
        mentors: filteredMentors,
        query: query,
        totalResults: filteredMentors.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error processing search request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
