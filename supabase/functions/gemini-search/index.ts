
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Mentor {
  id: string;
  name: string;
  department: string;
  skills: string[];
  bio?: string;
  rating: number;
  review_count: number;
  profile_image?: string;
  linkedin_url?: string;
  cgpa?: number;
  year_of_studies?: string;
  university?: string;
  hobbies?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    console.log('Search query:', query)

    const apiKey = Deno.env.get('Gemini_API_Key')
    if (!apiKey) {
      throw new Error('Gemini API key not found')
    }

    // Fetch mentors from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration not found')
    }

    const mentorsResponse = await fetch(`${supabaseUrl}/rest/v1/mentors?select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!mentorsResponse.ok) {
      throw new Error(`Failed to fetch mentors: ${mentorsResponse.statusText}`)
    }

    const mentors: Mentor[] = await mentorsResponse.json()
    console.log(`Fetched ${mentors.length} mentors`)

    // Filter out mentors with "General" department
    const validMentors = mentors.filter(mentor => 
      mentor.department && mentor.department !== 'General'
    )

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-pro" })

    // Create context about available mentors for AI
    const mentorContext = validMentors.map(mentor => {
      return `Mentor: ${mentor.name}
Department: ${mentor.department}
Skills: ${mentor.skills?.join(', ') || 'Not specified'}
Bio: ${mentor.bio || 'No bio available'}
Rating: ${mentor.rating}/5 (${mentor.review_count} reviews)
University: ${mentor.university || 'Not specified'}
Year of Studies: ${mentor.year_of_studies || 'Not specified'}
CGPA: ${mentor.cgpa || 'Not specified'}
Hobbies: ${mentor.hobbies || 'Not specified'}
ID: ${mentor.id}`
    }).join('\n\n')

    const prompt = `
You are a helpful AI assistant that recommends mentors based on student queries. 
Here are the available mentors and their information:

${mentorContext}

Student Query: "${query}"

Based on the student's query, recommend the most suitable mentors. Consider:
1. Department/field matching
2. Relevant skills and expertise
3. Mentor ratings and experience
4. University and academic background
5. Hobbies and personal interests if relevant
6. CGPA and year of studies for academic guidance

Return your response as a JSON array of mentor IDs (strings), ordered by relevance (most relevant first).
Only include mentors that are genuinely relevant to the query.
Maximum 5 recommendations.

Example format: ["mentor-id-1", "mentor-id-2", "mentor-id-3"]

If no mentors are suitable, return an empty array: []
`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    console.log('AI Response:', text)
    
    // Parse the AI response to extract mentor IDs
    let recommendedMentorIds: string[] = []
    try {
      // Extract JSON array from the response
      const jsonMatch = text.match(/\[.*\]/)
      if (jsonMatch) {
        recommendedMentorIds = JSON.parse(jsonMatch[0])
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      // Fallback: try to extract IDs using regex
      const idMatches = text.match(/[a-f0-9-]{36}/g)
      if (idMatches) {
        recommendedMentorIds = idMatches.slice(0, 5)
      }
    }

    console.log('Recommended mentor IDs:', recommendedMentorIds)

    // Get the full mentor objects for recommended IDs
    const recommendedMentors = recommendedMentorIds
      .map(id => validMentors.find(mentor => mentor.id === id))
      .filter(mentor => mentor !== undefined)

    console.log(`Returning ${recommendedMentors.length} recommended mentors`)

    return new Response(
      JSON.stringify({ 
        mentors: recommendedMentors,
        query: query,
        totalMentorsSearched: validMentors.length
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in gemini-search function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        mentors: [],
        query: ''
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    )
  }
})
