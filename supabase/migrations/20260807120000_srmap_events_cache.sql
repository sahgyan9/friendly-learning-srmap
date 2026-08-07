-- Cache table for SRMAP's public events feed.
--
-- The events page (/marketplace) used to call events.srmap.edu.in directly
-- from every visitor's browser, on every page load. That WordPress site is
-- slow and answers with no caching of its own, so a first-time visitor paid
-- for a cold DNS+TLS handshake plus an unbounded REST call before a single
-- event or image could render -- worse than a returning visitor whose browser
-- already had a warm connection to that external host.
--
-- Populated by the sync-srmap-events edge function, refreshed daily by
-- pg_cron (see the sync-srmap-events-daily schedule migration). Every
-- visitor -- new or returning -- now reads this project's own Postgres
-- instead of the external site, so the two no longer behave differently.
--
-- Public data, no privacy concerns: readable by anon the same way
-- public.faculty is.

create table if not exists public.srmap_events_cache (
  id bigint primary key,
  title text not null,
  excerpt text not null default '',
  start_date text not null,
  end_date text not null,
  link text not null,
  image_url text,
  department text not null default 'SRMAP',
  event_type text not null default '',
  last_synced_at timestamptz not null default now()
);

alter table public.srmap_events_cache enable row level security;

create policy "Anyone can view srmap events"
  on public.srmap_events_cache
  for select
  to public
  using (true);

grant select on public.srmap_events_cache to anon, authenticated;
