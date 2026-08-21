-- Migration: 20260821180000_update_faculty_image_urls_to_storage.sql
-- Description: Update faculty image_url references from external srmap.edu.in URLs
-- to our self-hosted, highly optimized WebP portraits in Supabase Storage.

-- 1. Point all faculty with mirrored portraits to the Supabase Storage CDN
UPDATE public.faculty f
SET image_url = 'https://ruapdkrgcbqrhvsayvpf.supabase.co/storage/v1/object/public/faculty-portraits/' || o.name
FROM storage.objects o
WHERE o.bucket_id = 'faculty-portraits' 
  AND o.name = f.slug || '.webp';

-- 2. Clear placeholder building image for Mr. Vikas Choudhary
UPDATE public.faculty
SET image_url = NULL
WHERE slug = 'mr-vikas-choudhary' AND image_url LIKE '%srm-epic-building%';
