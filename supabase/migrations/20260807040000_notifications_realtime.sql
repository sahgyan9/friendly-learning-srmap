-- The navbar bell subscribes to postgres_changes on public.notifications, but
-- the table was never added to the supabase_realtime publication. No INSERT,
-- UPDATE, or DELETE on this table has ever reached a client: new notifications
-- and read-state changes only ever showed up after a manual page refresh.
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
