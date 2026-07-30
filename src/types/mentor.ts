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
