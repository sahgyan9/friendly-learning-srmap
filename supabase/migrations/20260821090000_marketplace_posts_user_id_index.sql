-- The index for marketplace_posts.user_id was written and then commented out
-- in 20250809110610_e96312df...sql, while the RLS policies on this table
-- (owner-scoped UPDATE/DELETE) filter on exactly that column. Every ownership
-- check has been sequential-scanning the table since. Adding it now rather
-- than editing the old migration, since that one may already be applied in
-- production.

create index if not exists idx_marketplace_posts_user_id
  on public.marketplace_posts (user_id);
