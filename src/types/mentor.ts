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
