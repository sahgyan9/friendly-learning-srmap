
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_STORYBOOK_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_STORYBOOK_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is not defined in environment variables.');
}

if (!supabaseKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY is not defined in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Re-export chat services
export * from "./services/chat";

// Re-export mentor services
export * from "./services/mentors";
