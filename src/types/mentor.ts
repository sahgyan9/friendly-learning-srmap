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
  availability_schedule?: {
    response_time?: string;
    response_rate?: string;
    mentees_count?: number;
    available_days?: string[];
    typical_time?: string;
  };
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
