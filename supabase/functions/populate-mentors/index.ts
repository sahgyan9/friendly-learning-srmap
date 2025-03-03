
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sample mentors data to populate the database
const sampleMentors = [
  {
    id: "1",
    name: "Dr. Aarav Sharma",
    department: "Computer Science",
    skills: ["Machine Learning", "Python", "Data Structures", "Algorithms"],
    rating: 4.8,
    profile_image: "https://randomuser.me/api/portraits/men/32.jpg",
    linkedin_url: "https://linkedin.com/in/sample1",
    bio: "Associate Professor with 10+ years of experience in ML and AI research. I enjoy helping students understand complex algorithms and implementing them in real-world scenarios.",
    review_count: 45
  },
  {
    id: "2",
    name: "Prof. Priya Patel",
    department: "Electrical Engineering",
    skills: ["Circuit Design", "VLSI", "Embedded Systems", "IoT"],
    rating: 4.7,
    profile_image: "https://randomuser.me/api/portraits/women/44.jpg",
    linkedin_url: "https://linkedin.com/in/sample2",
    bio: "Department Head with specialization in VLSI design. I'm passionate about helping students bridge theoretical knowledge with practical implementation.",
    review_count: 38
  },
  {
    id: "3",
    name: "Dr. Rahul Kapoor",
    department: "Mathematics",
    skills: ["Calculus", "Linear Algebra", "Discrete Math", "Statistics"],
    rating: 4.9,
    profile_image: "https://randomuser.me/api/portraits/men/62.jpg",
    linkedin_url: "https://linkedin.com/in/sample3",
    bio: "Mathematics professor who believes in making complex concepts simple. I've been teaching for 15 years and enjoy helping students develop their problem-solving abilities.",
    review_count: 56
  },
  {
    id: "4",
    name: "Dr. Ananya Desai",
    department: "Computer Science",
    skills: ["Web Development", "JavaScript", "React", "Node.js"],
    rating: 4.6,
    profile_image: "https://randomuser.me/api/portraits/women/22.jpg",
    linkedin_url: "https://linkedin.com/in/sample4",
    bio: "Assistant Professor specializing in modern web technologies. I love to mentor students in building real-world applications and preparing for industry roles.",
    review_count: 29
  },
  {
    id: "5",
    name: "Prof. Arjun Reddy",
    department: "Physics",
    skills: ["Mechanics", "Electromagnetism", "Quantum Physics", "Thermodynamics"],
    rating: 4.5,
    profile_image: "https://randomuser.me/api/portraits/men/22.jpg",
    linkedin_url: "https://linkedin.com/in/sample5",
    bio: "Physics professor with a focus on experimental physics. I enjoy helping students connect theoretical concepts with hands-on experiments.",
    review_count: 31
  },
  {
    id: "6",
    name: "Dr. Ishita Bose",
    department: "Biotechnology",
    skills: ["Molecular Biology", "Genetic Engineering", "Biochemistry", "Microbiology"],
    rating: 4.7,
    profile_image: "https://randomuser.me/api/portraits/women/55.jpg",
    linkedin_url: "https://linkedin.com/in/sample6",
    bio: "Associate Professor with research experience in genetic engineering. I mentor students in laboratory techniques and research methodologies.",
    review_count: 27
  },
  {
    id: "7",
    name: "Prof. Vikram Malhotra",
    department: "Mechanical Engineering",
    skills: ["CAD/CAM", "Thermodynamics", "Fluid Mechanics", "Machine Design"],
    rating: 4.8,
    profile_image: "https://randomuser.me/api/portraits/men/82.jpg",
    linkedin_url: "https://linkedin.com/in/sample7",
    bio: "Department Chair with industry experience in automotive design. I guide students in both theoretical concepts and practical applications in mechanical engineering.",
    review_count: 42
  },
  {
    id: "8",
    name: "Dr. Meera Iyer",
    department: "Computer Science",
    skills: ["Artificial Intelligence", "Natural Language Processing", "Deep Learning", "Computer Vision"],
    rating: 4.9,
    profile_image: "https://randomuser.me/api/portraits/women/33.jpg",
    linkedin_url: "https://linkedin.com/in/sample8",
    bio: "Research Professor focusing on AI and its applications. I mentor students in research projects and help them publish in top-tier conferences.",
    review_count: 50
  }
];

// Initialize the Supabase client with credentials from the environment
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if we should clear existing mentors first
    const { clear } = await req.json().catch(() => ({ clear: false }));
    
    if (clear) {
      // Delete all existing mentors
      const { error: deleteError } = await supabaseClient
        .from('mentors')
        .delete()
        .neq('id', '0'); // Delete all records
      
      if (deleteError) {
        console.error("Error clearing mentors table:", deleteError);
        return new Response(
          JSON.stringify({ error: "Failed to clear existing mentors" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      
      console.log("Cleared existing mentors");
    }
    
    // Insert sample mentors data
    const { data, error } = await supabaseClient
      .from('mentors')
      .upsert(sampleMentors);
    
    if (error) {
      console.error("Error populating mentors:", error);
      return new Response(
        JSON.stringify({ error: "Failed to populate mentors" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Populated ${sampleMentors.length} mentors` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in populate-mentors function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
