
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
  created_at?: string;
  cgpa?: number;
  year_of_studies?: string;
  university?: string;
  hobbies?: string;
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
}
