
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

// Sample mentors data
const mentorData = [
  {
    name: "Priya Sharma",
    department: "Computer Science",
    skills: ["Python", "Data Structures", "Machine Learning"],
    rating: 4.8,
    profile_image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/priyasharma",
    bio: "Senior CS student passionate about AI and machine learning. I love helping juniors understand complex programming concepts.",
    review_count: 24
  },
  {
    name: "Arjun Patel",
    department: "Electrical Engineering",
    skills: ["Circuit Design", "MATLAB", "IoT"],
    rating: 4.6,
    profile_image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/arjunpatel",
    bio: "Final year EE student working on IoT projects. Happy to guide students with circuit design and programming.",
    review_count: 18
  },
  {
    name: "Neha Reddy",
    department: "Computer Science",
    skills: ["Java", "Web Development", "Algorithms"],
    rating: 4.9,
    profile_image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/nehareddy",
    bio: "Experienced in web development and competitive programming. I enjoy simplifying complex concepts for newcomers.",
    review_count: 32
  },
  {
    name: "Rahul Verma",
    department: "Mechanical Engineering",
    skills: ["CAD", "Fluid Mechanics", "Thermodynamics"],
    rating: 4.7,
    profile_image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/rahulverma",
    bio: "Senior ME student specializing in CAD and simulation. I can help with design projects and theoretical concepts.",
    review_count: 15
  },
  {
    name: "Aisha Khan",
    department: "Business Administration",
    skills: ["Marketing", "Business Strategy", "Finance"],
    rating: 4.5,
    profile_image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/aishakhan",
    bio: "Business student with internship experience at major corporations. Can guide you through business case studies and marketing projects.",
    review_count: 22
  },
  {
    name: "Vikram Singh",
    department: "Computer Science",
    skills: ["Cybersecurity", "Networking", "C++"],
    rating: 4.4,
    profile_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/vikramsingh",
    bio: "Cybersecurity enthusiast with CTF competition experience. I can help with network security concepts and programming.",
    review_count: 19
  },
  {
    name: "Maya Patel",
    department: "Biotechnology",
    skills: ["Microbiology", "Biochemistry", "Lab Techniques"],
    rating: 4.7,
    profile_image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/mayapatel",
    bio: "Biotechnology major with research experience. I can help with lab techniques and understanding complex biological processes.",
    review_count: 27
  },
  {
    name: "David Kim",
    department: "Physics",
    skills: ["Quantum Mechanics", "Mathematics", "Scientific Computing"],
    rating: 4.9,
    profile_image: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/davidkim",
    bio: "Physics honors student passionate about quantum mechanics. I make complex physics concepts easy to understand.",
    review_count: 31
  },
  {
    name: "Sophia Chen",
    department: "Mathematics",
    skills: ["Calculus", "Linear Algebra", "Probability"],
    rating: 4.8,
    profile_image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/sophiachen",
    bio: "Math major with experience in tutoring. I specialize in making abstract mathematical concepts concrete and understandable.",
    review_count: 29
  },
  {
    name: "Miguel Rodriguez",
    department: "Chemical Engineering",
    skills: ["Process Engineering", "Thermodynamics", "MATLAB"],
    rating: 4.6,
    profile_image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/miguelrodriguez",
    bio: "Chemical engineering student specializing in process optimization. I can help with both theoretical concepts and practical applications.",
    review_count: 18
  },
  {
    name: "Fatima Ali",
    department: "Psychology",
    skills: ["Research Methods", "Statistics", "Cognitive Psychology"],
    rating: 4.7,
    profile_image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/fatimaali",
    bio: "Psychology major with research experience in cognitive studies. I can help with research design, data analysis, and understanding core concepts.",
    review_count: 22
  },
  {
    name: "Alex Johnson",
    department: "Civil Engineering",
    skills: ["Structural Analysis", "AutoCAD", "Construction Management"],
    rating: 4.5,
    profile_image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=256&q=80",
    linkedin_url: "https://linkedin.com/in/alexjohnson",
    bio: "Civil engineering student with internship experience at construction firms. I can help with design software and understanding structural principles.",
    review_count: 16
  }
];

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only process POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    // Check if the table is empty first
    const { count, error: countError } = await supabaseClient
      .from('mentors')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error("Error checking mentors table:", countError);
      return new Response(
        JSON.stringify({ error: "Failed to check if table is empty" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // If data already exists, don't insert again
    if (count && count > 0) {
      return new Response(
        JSON.stringify({ message: "Data already exists in mentors table", count }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert all the mentors
    const { data, error } = await supabaseClient
      .from('mentors')
      .insert(mentorData)
      .select();

    if (error) {
      console.error("Error inserting mentors:", error);
      return new Response(
        JSON.stringify({ error: "Failed to populate mentors table" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Mentors data successfully populated",
        count: data.length 
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
