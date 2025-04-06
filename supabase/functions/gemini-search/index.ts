
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


// Helper function to fetch mentors
async function fetchMentors() {
  const { data, error } = await supabaseClient
    .from('mentors')
    .select('*');

  if (error) {
    console.error("Error fetching mentors:", error);
    return [];
  }

  console.log("Fetched mentors:", data?.length || 0);
  return data || [];
}

// Helper function to use Gemini to analyze query and find mentors
async function searchWithGeminiAI(query: string, mentors: any[]) {
  if (!GOOGLE_API_KEY) {
    console.error("Google API key is not set");
    return { error: "API key not configured" };
  }

  try {
    const mentorsContext = mentors.map(mentor => {
      return `
        Name: ${mentor.name}
        Department: ${mentor.department}
        Skills: ${mentor.skills.join(', ')}
        Rating: ${mentor.rating}
        Bio: ${mentor.bio || 'No bio available'}
      `;
    }).join('\n\n');

    const prompt = `
      You are a helpful AI assistant for a university mentorship platform. Using the following context of available mentors, find the most relevant mentors for the user's query: "${query}".
      
      Mentor Database Context:
      ${mentorsContext}
      
      Based on the query, return ONLY a JSON array of mentor IDs that match the query best, ranked by relevance. Don't include any explanation or other text.
      The format should be: [{"id":"mentor-id-1"},{"id":"mentor-id-2"}]
      
      Try to understand not just keywords, but the intent behind the query. For example, if they ask for "programming help", consider mentors with skills like Python, Java, Web Development, etc.
    `;

    // Make the API call to Gemini
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
          temperature: 0.2,
          maxOutputTokens: 1024,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return { error: "Error communicating with Gemini API" };
    }

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data));

    // Extract the response text
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Parse the JSON array of mentor IDs from the response
    try {
      // Find JSON array in the response
      const jsonMatch = responseText.match(/\[.*\]/s);
      if (!jsonMatch) {
        console.error("No JSON array found in response");
        return { ids: [] };
      }
      
      const mentorIds = JSON.parse(jsonMatch[0]);
      return { ids: mentorIds };
    } catch (err) {
      console.error("Error parsing mentor IDs from Gemini response:", err);
      return { error: "Failed to parse Gemini response", raw: responseText };
    }
  } catch (error) {
    console.error("Error in Gemini search:", error);
    return { error: "Gemini search failed" };
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
    
    // Fetch all mentors from the database
    const mentors = await fetchMentors();
    
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
