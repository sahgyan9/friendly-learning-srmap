-- Lets the admin UI see, and record, which mentors have had their welcome.
--
-- The welcome is sent by hand: the admin's own mail client opens with the draft
-- and they press send. Nothing in the browser can observe that, so "sent" here
-- means the admin confirmed it, not that anything was measured. That is the
-- honest limit of a mailto: flow and the UI says as much.
--
-- The record lives in email_queue rather than a new table so the manual and
-- automatic paths cannot both fire: email_queue_one_welcome_per_mentor_idx is
-- unique on (recipient_id) where kind = 'welcome_mentor', so a hand-sent
-- welcome also stops the sweeper from posting a second one later.
--
-- email_queue has RLS on and no policies by design — only the service role
-- touches it. Both functions below are SECURITY DEFINER to reach past that, so
-- both check is_admin_user first and neither takes an address or a body.

/**
 * Everything the admin's welcome UI needs, per mentor: where to write, and
 * whether it has been done.
 *
 * The email has to come from here rather than the page's existing join. RLS on
 * public.users restricts SELECT to the caller's own row, so
 * `user:users!...(email)` embedded in the verification query silently resolves
 * to null for every applicant but yourself — which is why the admin page showed
 * "No email on file" against people who plainly had one.
 *
 * Returns only mentors whose application was approved, and only the address —
 * no mobile, no ID. An admin can already see the rest of the application.
 */
create or replace function public.admin_list_mentor_welcome_status()
returns table (
  user_id uuid,
  name text,
  email text,
  profile_image text,
  department text,
  approved_at timestamptz,
  sent_at timestamptz,
  welcomed boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Only an admin can read welcome status';
  end if;

  return query
  select
    v.user_id,
    coalesce(m.name, u.name, v.application_data->>'name') as name,
    u.email,
    coalesce(m.profile_image, u.profile_image) as profile_image,
    coalesce(m.department, u.department) as department,
    -- reviewed_at is null on the auto-approve path, which is now every
    -- application, so submission time is the only date that reliably exists.
    coalesce(v.reviewed_at, v.submitted_at) as approved_at,
    q.sent_at,
    (q.recipient_id is not null and q.sent_at is not null) as welcomed
  from public.mentor_verifications v
  join public.users u on u.id = v.user_id
  left join public.mentors m on m.id = v.user_id
  left join public.email_queue q
    on q.recipient_id = v.user_id and q.kind = 'welcome_mentor'
  where v.status = 'approved'
  order by q.sent_at is not null, coalesce(v.reviewed_at, v.submitted_at) desc;
end;
$$;

comment on function public.admin_list_mentor_welcome_status() is
  'Approved mentors with their email and whether a welcome has been recorded. Admin only.';

/**
 * Records that a mentor has been welcomed.
 *
 * Idempotent: pressing it twice is harmless, and it deliberately does not move
 * sent_at on a row that already has one — the first send is the one that
 * happened, and overwriting it would quietly rewrite history every time someone
 * reopened the dialog.
 */
create or replace function public.admin_mark_mentor_welcomed(p_mentor_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sent_at timestamptz;
begin
  if not public.is_admin_user(auth.uid()) then
    raise exception 'Only an admin can record a welcome';
  end if;

  if not exists (select 1 from auth.users where id = p_mentor_id) then
    raise exception 'No such user';
  end if;

  insert into public.email_queue (recipient_id, kind, sent_at)
  values (p_mentor_id, 'welcome_mentor', now())
  on conflict (recipient_id) where kind = 'welcome_mentor'
  do update set sent_at = coalesce(public.email_queue.sent_at, now())
  returning sent_at into v_sent_at;

  return v_sent_at;
end;
$$;

comment on function public.admin_mark_mentor_welcomed(uuid) is
  'Marks a mentor welcomed. Also blocks the automatic sender from sending a second one.';

revoke all on function public.admin_list_mentor_welcome_status() from public, anon;
revoke all on function public.admin_mark_mentor_welcomed(uuid) from public, anon;
grant execute on function public.admin_list_mentor_welcome_status() to authenticated;
grant execute on function public.admin_mark_mentor_welcomed(uuid) to authenticated;
