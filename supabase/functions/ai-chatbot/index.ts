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

    // Expert domains and skills mapping
    const expertDomains = {
      programming: {
        keywords: ['programming', 'coding', 'code', 'development', 'software', 'debugging', 'error', 'stuck'],
        skills: ['python', 'javascript', 'java', 'c++', 'programming', 'web development', 'software development'],
        departments: ['Computer Science', 'Information Technology', 'Software Engineering']
      },
      webdev: {
        keywords: ['web', 'website', 'frontend', 'backend', 'fullstack'],
        skills: ['react', 'javascript', 'html', 'css', 'node.js', 'web development'],
        departments: ['Computer Science', 'Information Technology']
      },
      dataScience: {
        keywords: ['data', 'machine learning', 'ai', 'analytics', 'statistics'],
        skills: ['python', 'machine learning', 'data science', 'deep learning', 'statistics'],
        departments: ['Computer Science', 'Data Science', 'Statistics']
      }
    };

    // Updated mentor matching logic
    const scoreMentor = (mentor: any, message: string) => {
      let score = 0;
      const messageLC = message.toLowerCase();
      
      // Find matching domain expertise
      for (const [domain, info] of Object.entries(expertDomains)) {
        // Check if query matches domain keywords
        if (info.keywords.some(kw => messageLC.includes(kw))) {
          // Check mentor's relevant skills
          const hasRelevantSkills = mentor.skills.some(skill => 
            info.skills.some(domainSkill => skill.toLowerCase().includes(domainSkill))
          );
          
          // Check department alignment
          const hasRelevantDepartment = info.departments.some(dept => 
            mentor.department.toLowerCase().includes(dept.toLowerCase())
          );
          
          if (hasRelevantSkills) score += 25;
          if (hasRelevantDepartment) score += 15;
          
          // Bonus for having both relevant skills and department
          if (hasRelevantSkills && hasRelevantDepartment) score += 10;
        }
      }
      
      // Add rating factor (less weight than expertise)
      score += mentor.rating * 2;
      
      return score;
    };

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
        // Score mentors based on expertise match
        const scoredMentors = allMentors.map(mentor => ({
          ...mentor,
          relevanceScore: scoreMentor(mentor, message)
        }));
        
        // Filter for highly relevant mentors only
        suggestedMentors = scoredMentors
          .filter(mentor => mentor.relevanceScore > 20) // Higher threshold for better matches
          .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .slice(0, 2); // Top 2 most relevant mentors
        
        // If no highly relevant mentors found, fall back to best available in the domain
        if (suggestedMentors.length === 0) {
          // Try to match based on department for technical queries
          if (message.toLowerCase().includes('programming') || message.toLowerCase().includes('coding')) {
            const techMentors = allMentors.filter(mentor =>
              mentor.department.toLowerCase().includes('computer') ||
              mentor.skills.some(skill => 
                ['programming', 'python', 'javascript', 'web development']
                  .some(tech => skill.toLowerCase().includes(tech))
              )
            ).sort((a, b) => b.rating - a.rating)
            .slice(0, 2);
            
            if (techMentors.length > 0) {
              suggestedMentors = techMentors;
            }
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
