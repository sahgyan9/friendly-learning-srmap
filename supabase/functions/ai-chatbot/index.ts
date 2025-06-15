
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

    // Enhanced prompt for better structured responses
    const enhancedPrompt = `You are a helpful AI assistant for a university mentorship platform. 

User question: "${message}"

Please provide a well-structured, helpful response that:
1. Directly addresses their question
2. Is clear and easy to understand
3. Uses proper formatting with paragraphs when needed
4. Provides actionable advice when appropriate
5. Maintains a friendly, supportive tone

Keep your response concise but comprehensive.`;

    // Get AI response from Gemini with better prompting
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
              text: enhancedPrompt
            }]
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

    // Enhanced mentor suggestion logic with better software-specific matching
    const softwareKeywords = {
      'fusion 360': ['fusion 360', 'autodesk fusion', 'cad design', '3d modeling', 'mechanical design', 'product design'],
      'autocad': ['autocad', 'cad', 'drafting', 'technical drawing', '2d design'],
      'solidworks': ['solidworks', 'cad', '3d modeling', 'mechanical design', 'engineering'],
      'python': ['python', 'programming', 'coding', 'machine learning', 'data science'],
      'javascript': ['javascript', 'js', 'web development', 'react', 'node.js', 'frontend'],
      'react': ['react', 'reactjs', 'frontend', 'web development', 'javascript'],
      'quantum': ['quantum computing', 'quantum mechanics', 'quantum physics', 'qubits'],
      'machine learning': ['machine learning', 'ml', 'ai', 'data science', 'neural networks'],
      'data analysis': ['data analysis', 'statistics', 'data science', 'analytics', 'visualization']
    };

    const mentorKeywords = {
      programming: ['help', 'code', 'programming', 'coding', 'development', 'python', 'javascript', 'react', 'web', 'software', 'algorithm', 'debug', 'error', 'function'],
      academic: ['study', 'learn', 'understand', 'explain', 'homework', 'assignment', 'exam', 'test', 'course', 'class', 'lecture', 'concept'],
      career: ['career', 'job', 'internship', 'interview', 'resume', 'advice', 'guidance', 'future', 'path', 'opportunity'],
      technical: ['quantum', 'physics', 'engineering', 'circuit', 'design', 'research', 'project', 'technical', 'analysis'],
      design: ['fusion 360', 'cad', 'autocad', 'solidworks', 'design', '3d modeling', 'mechanical', 'product design'],
      general: ['mentor', 'guidance', 'advice', 'help', 'support', 'stuck', 'confused', 'difficulty', 'challenge', 'problem']
    };

    const needsMentor = Object.values(mentorKeywords).flat().some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    let suggestedMentors = [];

    if (needsMentor) {
      // Get all mentors first
      const { data: allMentors, error } = await supabase
        .from('mentors')
        .select('*')
        .limit(10);

      if (!error && allMentors && allMentors.length > 0) {
        // Advanced relevance scoring with software-specific matching
        const scoredMentors = allMentors.map(mentor => {
          let score = 0;
          const searchTerms = message.toLowerCase().split(' ').filter(term => term.length > 2);
          const messageText = message.toLowerCase();
          
          // Check for exact software matches first (highest priority)
          Object.entries(softwareKeywords).forEach(([software, keywords]) => {
            if (messageText.includes(software)) {
              keywords.forEach(keyword => {
                mentor.skills.forEach(skill => {
                  if (skill.toLowerCase().includes(keyword.toLowerCase())) {
                    score += 15; // Very high score for exact software matches
                  }
                });
                
                if (mentor.department.toLowerCase().includes(keyword.toLowerCase())) {
                  score += 10;
                }
                
                if (mentor.bio?.toLowerCase().includes(keyword.toLowerCase())) {
                  score += 8;
                }
              });
            }
          });
          
          searchTerms.forEach(term => {
            // Name matching (high priority)
            if (mentor.name.toLowerCase().includes(term)) score += 5;
            
            // Department matching (high priority)
            if (mentor.department.toLowerCase().includes(term)) score += 6;
            
            // Skills matching (very high priority)
            mentor.skills.forEach(skill => {
              const skillLower = skill.toLowerCase();
              if (skillLower.includes(term)) {
                score += 10; // Increased from 6
              }
              // Partial skill matching
              if (skillLower.split(' ').some(skillWord => skillWord.includes(term))) {
                score += 5; // Increased from 3
              }
            });
            
            // Bio matching (medium priority)
            if (mentor.bio?.toLowerCase().includes(term)) score += 4; // Increased from 3
            
            // Specific domain matching with higher scores
            if (term.includes('fusion') && messageText.includes('360')) {
              if (mentor.skills.some(skill => 
                ['fusion 360', 'cad', '3d modeling', 'mechanical design', 'product design', 'autodesk'].some(tech => 
                  skill.toLowerCase().includes(tech)
                ))) {
                score += 20; // Very high score for Fusion 360 specific matches
              }
            }
            
            if (term.includes('quantum') && 
                (mentor.skills.some(skill => skill.toLowerCase().includes('quantum')) ||
                 mentor.department.toLowerCase().includes('physics'))) {
              score += 12; // Increased from 8
            }
            
            if (['programming', 'coding', 'code'].some(prog => term.includes(prog))) {
              if (mentor.skills.some(skill => 
                ['python', 'javascript', 'programming', 'coding', 'development', 'software'].some(tech => 
                  skill.toLowerCase().includes(tech)
                ))) {
                score += 10; // Increased from 7
              }
            }
            
            if (['web', 'frontend', 'react', 'javascript'].some(web => term.includes(web))) {
              if (mentor.skills.some(skill => 
                ['react', 'web', 'frontend', 'javascript', 'html', 'css', 'node'].some(tech => 
                  skill.toLowerCase().includes(tech)
                ))) {
                score += 10; // Increased from 7
              }
            }

            // CAD and design software matching
            if (['cad', 'autocad', 'solidworks', 'design', 'modeling'].some(design => term.includes(design))) {
              if (mentor.skills.some(skill => 
                ['cad', 'autocad', 'solidworks', 'fusion 360', '3d modeling', 'mechanical design', 'product design'].some(tech => 
                  skill.toLowerCase().includes(tech)
                ))) {
                score += 12;
              }
            }
          });
          
          // Boost score based on rating
          score += mentor.rating * 0.8; // Increased from 0.5
          
          return { ...mentor, relevanceScore: score };
        });

        // Filter and sort mentors with higher threshold for better quality
        suggestedMentors = scoredMentors
          .filter(mentor => mentor.relevanceScore > 3) // Slightly higher threshold
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 3); // Top 3 most relevant mentors

        // If no highly relevant mentors, fall back to top-rated mentors in related fields
        if (suggestedMentors.length === 0) {
          // Try to find mentors in engineering/technical fields first
          const technicalMentors = allMentors.filter(mentor => 
            mentor.department.toLowerCase().includes('engineering') ||
            mentor.department.toLowerCase().includes('computer') ||
            mentor.department.toLowerCase().includes('design') ||
            mentor.skills.some(skill => 
              ['cad', 'design', 'engineering', 'technical', 'programming'].some(tech =>
                skill.toLowerCase().includes(tech)
              )
            )
          );
          
          if (technicalMentors.length > 0) {
            suggestedMentors = technicalMentors
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 2);
          } else {
            // Final fallback to highest rated mentors
            suggestedMentors = allMentors
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 2);
          }
        }
      }
    }

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
        error: 'I apologize, but I encountered an error processing your request. Please try again in a moment.',
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
