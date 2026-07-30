-- Let the application form tell someone their College ID is already registered
-- while they are still typing, instead of accepting the application and flagging
-- it after the fact.
--
-- This cannot be a plain client query. public.users is readable only where
-- auth.uid() = id, so the browser can never see another person's row and would
-- always be told the ID is free. Hence a SECURITY DEFINER function that returns
-- a bare boolean: enough to warn the applicant, and it never reveals who holds
-- the ID or anything else about them.
--
-- Sign-in is required. The IDs are semi-guessable (a cohort prefix plus a short
-- sequence), so an open endpoint would let anyone enumerate which SRM AP
-- students have accounts here. Requiring an account raises the cost of that and
-- makes it attributable, while the form only ever needs it for signed-in users.
--
-- The trigger still re-checks on insert. This is a courtesy to the applicant,
-- not the enforcement point — the unique index and the duplicate flag are.

create or replace function public.is_college_id_taken(p_college_id text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_id text;
begin
  if auth.uid() is null then
    raise exception 'Sign in to check a College ID';
  end if;

  -- Normalise before the format test, not after. Checking the raw input meant a
  -- lowercase ID failed the pattern and returned "free" even when it was taken,
  -- so the duplicate warning could be bypassed just by not holding shift.
  v_id := upper(regexp_replace(coalesce(p_college_id, ''), '[[:space:]-]', '', 'g'));

  if v_id !~ '^AP[0-9]{11}$' then
    -- Nothing to look up; the form reports the format problem separately.
    return false;
  end if;

  return exists (
    select 1 from public.users u
     where u.college_id = v_id
       and u.id <> auth.uid()   -- your own ID is not a conflict when re-editing
  );
end;
$$;

revoke all on function public.is_college_id_taken(text) from public, anon;
grant execute on function public.is_college_id_taken(text) to authenticated;

comment on function public.is_college_id_taken(text) is
  'Whether another account already claims this enrollment number. Returns a bare boolean; never exposes the holder. Authenticated callers only.';
