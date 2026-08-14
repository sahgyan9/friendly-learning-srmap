-- Adds rich event fields to srmap_events_cache so students can view the full
-- event details, venue, organizer, and registration links directly on-platform.

alter table public.srmap_events_cache
  add column if not exists content text not null default '',
  add column if not exists venue text,
  add column if not exists organizer text,
  add column if not exists registration_url text,
  add column if not exists registration_label text;

-- Ensure select privileges extend to the newly added columns for anon and authenticated
grant select on public.srmap_events_cache to anon, authenticated;
