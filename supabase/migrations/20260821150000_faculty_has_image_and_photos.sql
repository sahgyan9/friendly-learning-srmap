-- =============================================================================
-- Migration: 20260821150000_faculty_has_image_and_photos.sql
--
-- 1. Updates image_url for 15 faculty members whose portraits were found on the
--    SRM AP website media server.
-- 2. Adds stored generated boolean column `has_image` to public.faculty.
-- 3. Explicitly GRANTS SELECT (has_image) to anon and authenticated (preventing 42501).
-- 4. Creates index on (has_image DESC, name ASC) so faculty without photos are
--    efficiently ordered to the bottom of directory listings.
-- =============================================================================

-- 1. Update discovered faculty photos
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/06/Dr.-Ahmet-Ilker-Topuz-scaled.jpg', updated_at = NOW() WHERE id = '3283c82e-0312-4bd8-bc58-fcc1a84d0274';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/02/Dr.-Abhimanyu-Bar-1-scaled.jpg', updated_at = NOW() WHERE id = '2ce30865-b057-4074-a486-6a33dd58c65f';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/07/Dr-Akshaya-Kumar-Das-1-scaled.jpg', updated_at = NOW() WHERE id = 'c996fc0f-acec-4cab-ad14-c5c8ba25f7b1';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/07/Dr.-Amit-Kumar-scaled.jpg', updated_at = NOW() WHERE id = '438d5c38-8aa6-4e01-a392-f8a2b357d73f';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/08/Dr.-Kuncham-Eshwar-1-scaled.jpg', updated_at = NOW() WHERE id = '5d89bb38-f3e7-4c17-adb0-6a33f3e8829d';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2025/04/geeta-devi.jpg', updated_at = NOW() WHERE id = '74f0d9a6-0f9f-491f-a3b0-2eae52a2f178';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/02/Dr-Kartick-Chandra-Mondal-2-scaled.jpg', updated_at = NOW() WHERE id = 'e7dae5c1-86a4-40c9-b799-f981afdfae04';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/06/Dr.-Madasu-Venkateswara-Rao-2-scaled.jpg', updated_at = NOW() WHERE id = 'ab75dd90-1053-4689-a047-a00befa5db7e';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2025/04/mohit-aggarwal.jpg', updated_at = NOW() WHERE id = '6832c5f4-5da6-4c67-8e42-0125c0ed980e';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/07/Dr-Pankaj-Kumar-Raghuwanshi.jpg', updated_at = NOW() WHERE id = 'bd1904d5-632f-4efe-bf5c-9b7924849ce5';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/07/Dr.-Puspendu-Pradhan-scaled.jpg', updated_at = NOW() WHERE id = '7cdc2f66-b95c-449d-94b2-373ef251476d';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/07/Dr.-Saduri-Das-scaled.jpg', updated_at = NOW() WHERE id = 'ef529c1d-d131-49d2-8279-d26656b169ce';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/06/Dr-Sunil-KUmar-5.jpg', updated_at = NOW() WHERE id = '641ba3f7-5c08-4641-8b69-08cf10be2d40';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/06/Vadim-Azhmyakov-scaled.jpg', updated_at = NOW() WHERE id = '3d1f910c-1de5-497d-99b5-20d79943e54e';
UPDATE public.faculty SET image_url = 'https://www.srmap.edu.in/wp-content/uploads/2026/07/Mr.-M-Sreenivasan-scaled.jpg', updated_at = NOW() WHERE id = '9b15be8d-15e2-40f8-bf36-9f66a7e18363';

-- 2. Add has_image stored generated column
ALTER TABLE public.faculty
  ADD COLUMN IF NOT EXISTS has_image BOOLEAN
  GENERATED ALWAYS AS (
    (image_url IS NOT NULL AND TRIM(image_url) != '') OR
    (profile_image IS NOT NULL AND TRIM(profile_image) != '')
  ) STORED;

-- 3. Column grants (REQUIRED: anon has column-level SELECT on public.faculty)
GRANT SELECT (has_image) ON public.faculty TO anon;
GRANT SELECT (has_image) ON public.faculty TO authenticated;

-- 4. Index for sorting
CREATE INDEX IF NOT EXISTS idx_faculty_has_image_name
  ON public.faculty (has_image DESC, name ASC);
