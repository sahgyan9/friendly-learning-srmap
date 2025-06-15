
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    
    const geminiApiKey = Deno.env.get('Gemini_API_Key');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Get AI response from Gemini
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a helpful AI assistant. Provide a helpful response to: ${message}`
            }]
          }]
        })
      }
    );

    const geminiData = await geminiResponse.json();
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process your request.";

    // Check if the query might benefit from mentor suggestions
    const mentorKeywords = [
      'help', 'learn', 'teach', 'mentor', 'guidance', 'advice', 'programming', 'coding', 
      'development', 'python', 'javascript', 'react', 'web', 'software', 'computer science',
      'physics', 'quantum', 'engineering', 'career', 'study', 'university', 'skill',
      'problem', 'stuck', 'confused', 'difficulty', 'challenge'
    ];

    const needsMentor = mentorKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    let suggestedMentors = [];

    if (needsMentor) {
      // Search for relevant mentors using similar logic to existing search
      const { data: mentors, error } = await supabase
        .from('mentors')
        .select('*')
        .limit(3);

      if (!error && mentors) {
        // Simple relevance scoring based on skills and keywords
        const scoredMentors = mentors.map(mentor => {
          let score = 0;
          const searchTerms = message.toLowerCase().split(' ');
          
          searchTerms.forEach(term => {
            if (mentor.name.toLowerCase().includes(term)) score += 3;
            if (mentor.department.toLowerCase().includes(term)) score += 2;
            if (mentor.bio?.toLowerCase().includes(term)) score += 2;
            mentor.skills.forEach(skill => {
              if (skill.toLowerCase().includes(term)) score += 3;
            });
          });
          
          return { ...mentor, relevanceScore: score };
        });

        suggestedMentors = scoredMentors
          .filter(mentor => mentor.relevanceScore > 0)
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3);
      }
    }

    return new Response(
      JSON.stringify({
        aiResponse,
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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
