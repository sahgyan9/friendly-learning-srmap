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
