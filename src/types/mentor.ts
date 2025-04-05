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
  is_admin?: boolean;
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

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string;
  price?: string;
  features?: string[];
  cta_text: string;
  cta_url: string;
  badge_text?: string;
  badge_color?: string;
  created_at?: string;
  created_by: string;
}
