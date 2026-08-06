-- Community join-request, decision, and invite notifications never carried a
-- `data.community_slug`, so the frontend (src/utils/notificationNavigation.ts)
-- had nothing to build a deep link from and fell back to the plain
-- `/communities` list instead of the specific group's requests tab. Attach
-- the slug (and request id, where useful) so notifications route to the page
-- where the recipient can actually act.

create or replace function public.request_to_join_community(
  p_community_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_owner uuid;
  v_name text;
  v_slug text;
  v_asker text;
begin
  if v_actor is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  select c.owner_id, c.name, c.slug into v_owner, v_name, v_slug
    from public.communities c
   where c.id = p_community_id and not c.is_archived and c.visibility = 'private';

  if v_owner is null then
    raise exception 'That group is not accepting requests' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.community_members m
              where m.community_id = p_community_id and m.user_id = v_actor) then
    raise exception 'You are already in this group' using errcode = '22023';
  end if;

  insert into public.community_join_requests (community_id, user_id, message)
  values (p_community_id, v_actor, nullif(btrim(coalesce(p_message, '')), ''))
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    raise exception 'You already have a request waiting on this group' using errcode = '22023';
  end if;

  select name into v_asker from public.users where id = v_actor;

  insert into public.notifications (user_id, type, title, content, data)
  values (
    v_owner, 'system', 'Someone wants to join your group',
    format('%s asked to join %s.', coalesce(v_asker, 'A student'), coalesce(v_name, 'your group')),
    jsonb_build_object('type', 'community_join_request', 'community_slug', v_slug, 'request_id', v_id)
  );

  return v_id;
end;
$$;

comment on function public.request_to_join_community(uuid, text) is
  'Student asks to join a private group; the owner gets a notification.';

revoke all on function public.request_to_join_community(uuid, text) from public, anon;
grant execute on function public.request_to_join_community(uuid, text) to authenticated;

-- Owner's approve/decline decision, notified back to the requester.
create or replace function public.decide_join_request(
  p_request_id uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_req public.community_join_requests%rowtype;
  v_name text;
  v_slug text;
begin
  if v_actor is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  select * into v_req
    from public.community_join_requests
   where id = p_request_id
   for update;

  if not found then
    raise exception 'That request no longer exists' using errcode = 'P0002';
  end if;

  if not (public.is_community_owner(v_req.community_id, v_actor)
          or public.is_admin_user(v_actor)) then
    raise exception 'Only the group owner can decide this' using errcode = '42501';
  end if;

  if v_req.status <> 'pending' then
    raise exception 'That request has already been dealt with' using errcode = '22023';
  end if;

  update public.community_join_requests
     set status = case when p_approve then 'approved' else 'declined' end,
         decided_at = now(),
         decided_by = v_actor
   where id = p_request_id;

  if p_approve then
    insert into public.community_members (community_id, user_id, role)
    values (v_req.community_id, v_req.user_id, 'member')
    on conflict do nothing;
  end if;

  select name, slug into v_name, v_slug from public.communities where id = v_req.community_id;

  insert into public.notifications (user_id, type, title, content, data)
  values (
    v_req.user_id,
    'system',
    case when p_approve then 'You are in 🎉' else 'Request not accepted' end,
    case
      when p_approve then format('You have joined %s. Say hello — the group can see your posts now.', coalesce(v_name, 'the group'))
      else format('Your request to join %s was not accepted this time.', coalesce(v_name, 'that group'))
    end,
    jsonb_build_object('community_slug', v_slug)
  );
end;
$$;

comment on function public.decide_join_request(uuid, boolean) is
  'Owner approves or declines a pending request. Approving also creates the membership, in one transaction.';

revoke all on function public.decide_join_request(uuid, boolean) from public, anon;
grant execute on function public.decide_join_request(uuid, boolean) to authenticated;

-- Invite notification, so the invitee lands on the group to accept/decline.
create or replace function public.invite_to_community(
  p_community_id uuid,
  p_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_name text;
  v_slug text;
begin
  if v_actor is null then
    raise exception 'You need to be signed in' using errcode = '28000';
  end if;

  if not public.is_community_owner(p_community_id, v_actor) then
    raise exception 'Only the group owner can invite people' using errcode = '42501';
  end if;

  if exists (select 1 from public.community_members m
              where m.community_id = p_community_id and m.user_id = p_user_id) then
    raise exception 'They are already in this group' using errcode = '22023';
  end if;

  insert into public.community_invites (community_id, invited_user_id, invited_by)
  values (p_community_id, p_user_id, v_actor)
  on conflict do nothing
  returning id into v_id;

  if v_id is null then
    -- An unanswered invite already exists; saying so beats a duplicate.
    raise exception 'They already have an invitation waiting' using errcode = '22023';
  end if;

  select name, slug into v_name, v_slug from public.communities where id = p_community_id;

  insert into public.notifications (user_id, type, title, content, data)
  values (
    p_user_id, 'system', 'You have been invited to a group',
    format('You have been invited to join %s.', coalesce(v_name, 'a group')),
    jsonb_build_object('community_slug', v_slug)
  );

  return v_id;
end;
$$;

comment on function public.invite_to_community(uuid, uuid) is
  'Owner invites someone into their group and notifies them.';

revoke all on function public.invite_to_community(uuid, uuid) from public, anon;
grant execute on function public.invite_to_community(uuid, uuid) to authenticated;
