-- The admin notification fired on every new mentor application still said
-- "requires review" and linked to /admin/mentor-verification. Both were true
-- before 2026-07-30; since auto_approve_mentor_application, this AFTER INSERT
-- trigger only ever fires on a row that is already approved (see
-- [[verification-approve-then-flag]]) — nothing is actually pending review
-- here. The one real next step for the admin is /admin/welcome-emails (built
-- in 20260731150000_welcome_email_tracking.sql), which nothing was pointing
-- at. Same missing-`data.url` shape as the community notifications fixed in
-- 20260806200000.
--
-- Flags, if any, are a separate concern (surfaced on the "Needs review" tab
-- of /admin/mentor-verification) and are noted in the content rather than
-- changing the destination, so this stays a one-notification, one-click flow.

create or replace function public.notify_admin_mentor_application()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  admin_user record;
  v_name text;
  v_flag_count int;
  v_content text;
begin
  select coalesce(u.name, 'A new mentor') into v_name
    from public.users u where u.id = new.user_id;

  v_flag_count := coalesce(array_length(new.flags, 1), 0);

  v_content := format('%s just joined as a mentor. Their profile is live — send them a welcome.', v_name);
  if v_flag_count > 0 then
    v_content := v_content || format(' (%s flag%s noted — worth a look on Needs review.)',
      v_flag_count, case when v_flag_count = 1 then '' else 's' end);
  end if;

  for admin_user in
    select id from public.users where is_admin = true
  loop
    insert into public.notifications (user_id, type, title, content, data)
    values (
      admin_user.id,
      'system',
      'New mentor — say welcome 👋',
      v_content,
      jsonb_build_object(
        'url', '/admin/welcome-emails',
        'type', 'mentor_welcome_pending',
        'verification_id', new.id,
        'user_id', new.user_id
      )
    );
  end loop;

  return new;
end;
$$;

comment on function public.notify_admin_mentor_application() is
  'Notifies admins of a new (already auto-approved) mentor and points them at the welcome-email flow.';
