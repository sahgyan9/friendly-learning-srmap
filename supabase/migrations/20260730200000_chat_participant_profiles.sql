-- Show the other person's name in a conversation.
--
-- Every chat with a student rendered as "Unknown User". The names were in the
-- database the whole time -- RLS on public.users allows SELECT only where
-- auth.uid() = id, so you can read your own row and nobody else's. The chat
-- code read users directly, got nothing back, and fell through to a fallback
-- that reads public.mentors. Mentors are world-readable, so mentor names worked
-- and student names did not, which is exactly the pattern in the bug report.
--
-- The tempting fix is a policy letting any signed-in user read public.users.
-- That would also hand every user everyone else's email, mobile, College ID and
-- CGPA, so it is not on the table. Instead this returns the four fields a chat
-- header actually renders, and only for people the caller is already in a
-- conversation with.
--
-- Note it does not fall back to an email prefix the way the old client code did.
-- That fallback silently disclosed part of an address, and only ever worked for
-- the caller's own row in the first place.

create or replace function public.chat_participant_profiles(p_user_ids uuid[])
returns table (
  id            uuid,
  name          text,
  profile_image text,
  role          text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.name, u.profile_image, u.role
    from public.users u
   where u.id = any(p_user_ids)
     and (
       -- Yourself, and anyone you already share a conversation with. A user id
       -- alone is not enough: without this, passing arbitrary ids would turn
       -- the function into a directory of every name on the platform.
       u.id = auth.uid()
       or exists (
         select 1
           from public.conversations c
          where (c.user1_id = auth.uid() and c.user2_id = u.id)
             or (c.user2_id = auth.uid() and c.user1_id = u.id)
       )
     );
$$;

comment on function public.chat_participant_profiles(uuid[]) is
  'Display fields only (name, image, role) for people the caller shares a conversation with. Deliberately excludes email, mobile, college_id and cgpa.';

revoke all on function public.chat_participant_profiles(uuid[]) from public, anon;
grant execute on function public.chat_participant_profiles(uuid[]) to authenticated;
