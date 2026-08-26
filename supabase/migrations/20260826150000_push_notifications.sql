-- Web Push Notification Subscriptions & Preferences
-- Allows multi-device browser push notification delivery for messages,
-- mentor applications, community invites, and campus events.

-- 1. User preferences column
alter table public.users
  add column if not exists push_notifications_enabled boolean default true;

-- Ensure column is selectable by authenticated users
grant select (push_notifications_enabled) on public.users to authenticated;

-- 2. Push subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_user_endpoint_key unique (user_id, endpoint)
);

create index if not exists idx_push_subscriptions_user_id
  on public.push_subscriptions (user_id);

-- 3. Row Level Security & Grants
alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from public, anon;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

drop policy if exists "Users manage their own push subscriptions" on public.push_subscriptions;
create policy "Users manage their own push subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.push_subscriptions is
  'Browser Web Push subscriptions (VAPID endpoints and keys) per user and device.';
