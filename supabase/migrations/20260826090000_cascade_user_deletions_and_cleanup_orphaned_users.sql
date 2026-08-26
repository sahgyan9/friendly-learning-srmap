-- Clean up any orphaned records in public.users where the corresponding
-- auth.users record was deleted from Supabase Auth.
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- Enforce foreign key from public.users(id) to auth.users(id) with ON DELETE CASCADE.
-- This guarantees that when a user is deleted from Supabase Auth in the dashboard or via API,
-- their public.users row is automatically purged so future sign-ups with the same email
-- never collide with an orphaned record.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'users_id_fkey' AND table_name = 'users'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_fkey
      FOREIGN KEY (id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;
