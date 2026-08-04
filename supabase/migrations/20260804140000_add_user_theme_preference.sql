ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS theme text CHECK (theme IN ('dark', 'light'));

COMMENT ON COLUMN public.users.theme IS
  'Explicit theme choice synced from the client, null until the user toggles it while signed in. Existing UPDATE policy (auth.uid() = id) already covers writes.';
