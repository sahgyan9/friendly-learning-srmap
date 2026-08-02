-- Groups were mentor-only. They are now open to any signed-in student.
--
-- The original reason for the gate was that a group with nobody in it is worse
-- than no group, and mentors were the people most likely to actually run one.
-- In practice it also meant a first-year who wanted a hackathon team — the exact
-- person the feature is for — had to apply to be a mentor first.
--
-- Nothing else about the model changes. The owner still controls membership,
-- private groups still go through requests and invites, and posting inside a
-- group is still members-only. What is removed is a check on who may press
-- "Start a group" in the first place.
--
-- A cap replaces it. Not a permission so much as a brake: nothing here needs one
-- person owning fifty groups, and an unlimited insert policy on a public table
-- is how a listing page fills with noise in an afternoon. Archived groups do not
-- count, so someone who ran a hackathon team last term is not blocked by it.

create or replace function public.can_start_another_group(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_user is not null
     and (
       select count(*)
         from public.communities c
        where c.owner_id = p_user
          and not c.is_archived
     ) < 10;
$$;

comment on function public.can_start_another_group(uuid) is
  'True while a person owns fewer than 10 live groups. A brake on spam, not a permission check.';

grant execute on function public.can_start_another_group(uuid) to authenticated;

drop policy if exists "Mentors can create a community" on public.communities;

create policy "Signed-in students can start a group"
  on public.communities
  for insert
  to authenticated
  with check (
    owner_id = auth.uid()
    and public.can_start_another_group(auth.uid())
  );

-- public.is_active_mentor is left in place. It is still the right answer to
-- "is this person a listed mentor", and other things ask that question.
