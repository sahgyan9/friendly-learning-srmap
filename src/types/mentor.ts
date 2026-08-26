export interface Mentor {
  id: string;
  slug?: string;
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
  year_of_studies?: string | number;

  // --- Profile summary -------------------------------------------------------
  // These four were on this interface long before they were columns. Because
  // nothing backed them, every read returned undefined and mentor-enhancements
  // fell through to a template -- which is why every profile's "What I can help
  // you achieve" read the same. They became real columns in
  // 20260823190000_mentor_profile_summary.sql and are now drafted from the
  // mentor's own bio/projects/coursework by the generate-mentor-summary edge
  // function, or written by the mentor.
  //
  // Empty means empty. A consumer that finds nothing here must render nothing;
  // do not reintroduce a default.
  tagline?: string | null;
  outcomes?: string[];
  ideal_mentees?: string[];
  ask_me_anything?: Array<{ topic: string; icon?: string }>;
  /** Set when a summary was drafted for this mentor. Drives the "summarised
   *  from their profile" disclosure — visitors are told when words are not the
   *  mentor's own. */
  profile_summary_generated_at?: string | null;
  /** Set once the mentor has edited the summary. Generation never overwrites
   *  these rows, and the disclosure disappears because the words are theirs. */
  profile_summary_edited_at?: string | null;
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
  clubs?: string[];
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
