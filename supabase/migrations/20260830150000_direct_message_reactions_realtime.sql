-- The chat thread subscribes to postgres_changes on public.direct_message_reactions
-- (see useMessageRealtime.ts) to refetch messages when a reaction is added or
-- removed, but 20260830130000_direct_message_reactions.sql created the table
-- without ever adding it to the supabase_realtime publication. No INSERT,
-- UPDATE, or DELETE on this table has ever reached a client: a reaction only
-- became visible after a manual refresh re-ran get_conversation_messages.
-- Same class of bug as 20260807040000_notifications_realtime.sql and the
-- community_group_messages fix in 20260802140000 — guarded the same way so
-- this migration is safe to run whether or not the table already ended up in
-- the publication some other way.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'direct_message_reactions'
  ) then
    alter publication supabase_realtime add table public.direct_message_reactions;
  end if;
end $$;

-- Belt-and-braces: verify public.messages itself is still in the publication.
-- It predates migration-tracked realtime setup (added via the dashboard, per
-- the comment in 20250615165032), so there is no migration file to point to
-- as proof it is still there. Delivery/read-receipt ticks depend on UPDATE
-- events on this table reaching the sender live; guarding the add here costs
-- nothing if it's already present, and closes the gap silently if it is not.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
