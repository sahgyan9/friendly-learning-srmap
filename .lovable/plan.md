

## Anonymous Faculty Rating System

Add a section where signed-in students can browse SRMAP faculty by department and leave anonymous star ratings + comments.

### Faculty data
Create a `faculty` table in Supabase. I'll seed it with faculty from SRM University AP across the major schools (Engineering, Sciences, Liberal Arts, Management, Law). I'll fetch the public faculty directory from srmap.edu.in to populate names, departments, and designations. The table is fully manageable from the Supabase dashboard (and from a new admin page in the app).

```text
faculty
├── id (uuid)
├── name (text)
├── designation (text)         -- e.g. "Associate Professor"
├── department (text)          -- e.g. "Computer Science & Engineering"
├── school (text)              -- e.g. "School of Engineering & Sciences"
├── email (text, optional)
├── profile_image (text, optional)
└── created_at
```

```text
faculty_ratings
├── id (uuid)
├── faculty_id (uuid → faculty.id)
├── reviewer_id (uuid → auth.uid())   -- stored privately, NEVER returned
├── rating (int 1-5)
├── comment (text, max 500, optional)
└── created_at
UNIQUE (faculty_id, reviewer_id)       -- one rating per student per faculty
```

### Anonymity guarantees
- `reviewer_id` is stored to enforce one-rating-per-user, but the public RPC `get_faculty_ratings(faculty_id)` returns only `rating`, `comment`, `created_at` — never the reviewer.
- RLS: `SELECT` on `faculty_ratings` is **denied** to clients; reads go through the RPC. `INSERT` requires `auth.uid() = reviewer_id`. `UPDATE`/`DELETE` allowed only by the reviewer themselves (so they can edit their own rating).
- A trigger keeps a denormalized `avg_rating` and `rating_count` on `faculty` for fast list queries.

### Pages & UI

**`/faculty` (public, browseable)**
- Search bar + department filter (chips)
- Grid of faculty cards: photo, name, designation, department, average stars, rating count
- Click a card → faculty detail

**`/faculty/:id` (signed-in to rate, anyone to view)**
- Faculty header (photo, name, dept, school, average rating)
- "Rate this faculty" button → opens existing-style modal (1-5 stars + optional comment, 500 char limit)
- Reviews list below: shows "Anonymous Student · 2 days ago", stars, comment
- If user already rated → shows their current rating with "Edit" / "Delete" options

**`/admin/faculty` (admin only)**
- Table view: search, filter by department, add/edit/delete faculty
- Bulk-friendly so admin can also do CRUD directly in Supabase dashboard

### Navigation
Add a "Faculty" link to the main NavBar (between Mentors and Community).

### Files to add/change

**New**
- `supabase/migrations/<ts>_faculty_ratings.sql` — tables, RLS, RPC, trigger, seed data
- `src/pages/Faculty.tsx` — list page
- `src/pages/FacultyDetail.tsx` — detail + reviews
- `src/pages/AdminFaculty.tsx` — admin CRUD
- `src/components/faculty/FacultyCard.tsx`
- `src/components/faculty/FacultyFilters.tsx`
- `src/components/faculty/FacultyRatingModal.tsx` — adapted from existing `RatingModal`
- `src/components/faculty/FacultyReviewsList.tsx` — adapted from `ReviewsList`
- `src/integrations/supabase/services/faculty.ts`
- `src/hooks/useFacultyRating.ts`

**Modified**
- `src/App.tsx` — three new routes + NavBar item
- `src/pages/AdminDashboard.tsx` — add "Faculty Management" tile

### Faculty seeding approach
Before running the migration I'll scrape the public faculty directory at srmap.edu.in (using web search) to get a real, representative list across departments. If a department's directory is unreachable, I'll seed it with the department + designation row and an empty name list for the admin to fill in. Either way, you can edit/add directly in Supabase.

### Out of scope (can add later)
- Reporting abusive comments
- Multi-criteria ratings (teaching / fairness / etc.)
- Faculty self-claim of profile

