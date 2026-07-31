-- Restore mentors RLS policies that are live in the database but were never
-- captured in a migration file. 20250809110610 dropped three differently
-- named policies and assumed replacements existed without ever creating or
-- recording them. This re-declares the policies that are actually live today.

DROP POLICY IF EXISTS "Anyone can view mentor profiles" ON public.mentors;
CREATE POLICY "Anyone can view mentor profiles"
ON public.mentors
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can create their own mentor profile" ON public.mentors;
CREATE POLICY "Users can create their own mentor profile"
ON public.mentors
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own mentor profile" ON public.mentors;
CREATE POLICY "Users can update their own mentor profile"
ON public.mentors
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can delete their own mentor profile" ON public.mentors;
CREATE POLICY "Users can delete their own mentor profile"
ON public.mentors
FOR DELETE
TO authenticated
USING (auth.uid() = id);
