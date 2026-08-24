-- Mobile number as reported on the SRM portal's own profile page (menu id 1),
-- refreshed by sync-srm-portal alongside program/semester/cgpa/subjects.
-- Distinct from users.mobile, which is self-reported at signup and is never
-- overwritten by portal data. No RLS change needed: the existing owner-only
-- SELECT policy on academic_imports already covers the whole row.
ALTER TABLE public.academic_imports ADD COLUMN IF NOT EXISTS mobile_number TEXT;

COMMENT ON COLUMN public.academic_imports.mobile_number IS
  'Mobile number as shown on the SRM portal profile page, refreshed by sync-srm-portal. Distinct from users.mobile (self-reported at signup).';
