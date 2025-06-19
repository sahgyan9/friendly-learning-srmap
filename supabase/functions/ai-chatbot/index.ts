import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const geminiApiKey = Deno.env.get('Gemini_API_Key');

// Initialize the Supabase client
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

// Helper function to search for relevant mentors using Gemini
async function findRelevantMentors(query: string, mentors: any[]) {
  if (!geminiApiKey) {
    console.error("Gemini API key is not set");
    return [];
  }

  try {
    // Create the same mentor context format as the search bar
    const mentorsContext = mentors.map(mentor => {
      return `
        ID: ${mentor.id}
        Name: ${mentor.name}
        Department: ${mentor.department}
        Skills: ${mentor.skills.join(', ')}
        Rating: ${mentor.rating}
        Bio: ${mentor.bio || 'No bio available'}
      `;
    }).join('\n\n');

    // Use the same prompt structure as the search bar
    const mentorSearchPrompt = `
      You are a helpful AI assistant for a university mentorship platform. Using the following context of available mentors, find the most relevant mentors for the user's query: "${query}".
      
      Mentor Database Context:
      ${mentorsContext}
      
      Based on the query, return ONLY a JSON array of mentor IDs that match the query best, ranked by relevance. Don't include any explanation or other text.
      The format should be: [{"id":"1"},{"id":"2"}]
      
      Try to understand not just keywords, but the intent behind the query. For example, if they ask for "programming help", consider mentors with skills like Python, Java, Web Development, etc.
      
      Important: The IDs must exactly match one of the ID values provided in the context above.
    `;

    // Make API call to Gemini with the same configuration
    const mentorSearchResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + geminiApiKey,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: mentorSearchPrompt }]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    if (!mentorSearchResponse.ok) {
      console.error("Gemini API error for mentor search");
      return [];
    }

    const mentorSearchData = await mentorSearchResponse.json();
    const mentorSearchText = mentorSearchData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse mentor IDs using the same method as search bar
    try {
      const jsonMatch = mentorSearchText.match(/\[.*\]/s);
      if (!jsonMatch) {
        console.error("No JSON array found in mentor search response");
        return [];
      }

      const mentorIds = JSON.parse(jsonMatch[0]);
      const matchedMentors = mentors.filter(mentor => 
        mentorIds.some((item: {id: string}) => item.id === mentor.id)
      );
      return matchedMentors;
    } catch (err) {
      console.error("Error parsing mentor IDs:", err);
      return [];
    }
  } catch (error) {
    console.error("Error in Gemini mentor search:", error);
    return [];
  }
}

// Save conversation to database
async function saveConversation(userId: string | null, message: string, aiResponse: string, context: any = {}) {
  if (!userId) {
    console.warn('No user ID provided, conversation will not be saved');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: userId,
        message: message,
        response: aiResponse,
        context: context,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving conversation:', error);
    } else {
      console.log('Conversation saved successfully');
    }
  } catch (err) {
    console.error('Exception saving conversation:', err);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    
    if (!message) {
      throw new Error('No message provided');
    }

    // Get all mentors from the database
    const { data: allMentors, error: mentorsError } = await supabase
      .from('mentors')
      .select('*')
      .limit(10);

    if (mentorsError || !allMentors) {
      console.error("Error fetching mentors:", mentorsError);
      throw new Error('Failed to fetch mentors');
    }

    // Get AI response for the user's question
    const enhancedPrompt = `You are a helpful AI assistant for a university mentorship platform. 

User question: "${message}"

Please provide a well-structured, helpful response that:
1. Directly addresses their question
2. Is clear and easy to understand
3. Uses proper formatting with paragraphs when needed
4. Provides actionable advice when appropriate
5. Maintains a friendly, supportive tone

Keep your response concise but comprehensive.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: enhancedPrompt }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            topP: 0.8,
            topK: 40
          }
        })
      }
    );

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process your request. Please try rephrasing your question.";

    // Find relevant mentors using the same logic as the search bar
    const suggestedMentors = await findRelevantMentors(message, allMentors);

    // Save the conversation if we have a user ID
    await saveConversation(userId || null, message, aiResponse, {
      hasMentorSuggestions: suggestedMentors.length > 0,
      suggestedMentorCount: suggestedMentors.length
    });

    return new Response(
      JSON.stringify({
        aiResponse: aiResponse.trim(),
        suggestedMentors,
        hasMentorSuggestions: suggestedMentors.length > 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-chatbot function:', error);
    return new Response(
      JSON.stringify({ 
        aiResponse: 'I apologize, but I encountered an error processing your request. Please try again in a moment.',
        suggestedMentors: [],
        hasMentorSuggestions: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
