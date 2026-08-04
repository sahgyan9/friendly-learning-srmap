ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS has_seen_welcome_tour boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.has_seen_welcome_tour IS
  'Whether this user has dismissed or finished the first-login welcome tour. Existing UPDATE policy (auth.uid() = id) already covers writes.';
