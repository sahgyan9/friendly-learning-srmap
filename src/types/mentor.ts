export interface Mentor {
  id: string;
  name: string;
  department: string;
  skills: string[];
  rating: number;
  profile_image: string;
  linkedin_url?: string;
  bio?: string;
  review_count: number;
  university?: string;
  hobbies?: string;
  created_at?: string;
  mobile?: string;
  /**
   * False hides them from the directory. Their profile URL still resolves, so
   * existing links and conversations are unaffected.
   */
  is_available?: boolean;
  /** When a timed pause ends. Null while paused means "until I turn it back on". */
  available_from?: string | null;
  availability_note?: string | null;
  /** Set once the person has confirmed they graduated. Never inferred. */
  is_alumni?: boolean;
  graduation_year?: number | null;
  company?: string | null;
  job_title?: string | null;
  tagline?: string;
  year_of_studies?: string | number;
  outcomes?: string[];
  ask_me_anything?: string[];
  ideal_mentees?: string[];
  experiences?: Array<{
    id: string;
    title: string;
    organization?: string;
    period?: string;
  }>;
  projects?: Array<{
    id: string;
    title: string;
    description: string;
    link?: string;
  }>;
  /** Opt-in course list (code + name only) written by the "Show courses on
   * public profile" toggle — not free-text edited like the other fields. */
  courses?: Array<{ code: string; name: string }>;
  // No `availability_schedule` here. There was one, and it was never a column
  // on public.mentors -- so every read of it was undefined and every consumer
  // silently fell through to an invented default. Real reply figures come from
  // the mentor_activity RPC (see @/lib/mentor-activity).
  categorized_skills?: Record<string, string[]>;
}

export interface MentorFormData {
  name: string;
  department: string;
  skills: string[];
  rating: number;
  profile_image: string;
  linkedin_url?: string;
  bio?: string;
  review_count?: number;
  university?: string;
  hobbies?: string;
  mobile?: string;
}
