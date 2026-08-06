# Supabase changes

> **Working on faculty discovery, search, or the AI assistant?** Read
> [FACULTY_AI_ROADMAP.md](../../FACULTY_AI_ROADMAP.md) first. It is the plan of
> record: five phases, which are shipped, and — importantly — the approaches
> that were considered and deliberately rejected. Several decisions there look
> arbitrary without the reasoning (why interests are messy free text on purpose,
> why availability is deferred, why the existing chatbot's prompt-stuffing
> approach must not be copied, why training an LLM on this data is the wrong
> tool).

The frontend, the database, and the edge functions are **three separate deploy
targets**. Shipping one never ships the others. Full detail, including the
verification queries, is in [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md)
under "Supabase: three deploy targets, not one" — read it before changing
anything under `supabase/`.

The short version:

- **Never treat HTTP 200 as proof a function did its job.** A 200 means the code
  that ran did not crash. It does not mean the code that ran was the code you
  wrote. After editing a function, verify by asking *did the data change?* — not
  by reading the response body. This has already produced one confidently wrong
  "success" in this repo (627 rows synced, 0 columns populated, stale function
  against a fresh schema).
- **A migration file in the repo is not a migration in the database.** Read the
  live schema before assuming a column exists. Likewise, read the deployed
  function before assuming your edit is live.
- **Preserve `verify_jwt = false`** when redeploying any function here. They all
  authenticate themselves in code; the platform gate only checks the anon key,
  which ships in the client bundle, and it breaks the pg_cron path entirely.
- **New functions are exposed by default.** `REVOKE ALL ON FUNCTION ... FROM
  PUBLIC, anon, authenticated` for anything that is not deliberately an API.
  Revoking from `PUBLIC` alone is not enough — Supabase's default privileges
  grant to `anon` and `authenticated` separately.
- **Adding a column can silently revoke read access to its whole table.** Some
  tables here grant `anon` *column-level* SELECT rather than table-level, to
  withhold specific columns (`public.faculty` withholds `email` so anonymous
  visitors cannot harvest addresses). Column grants **do not extend to columns
  added later**, so the first query naming a new column fails with
  `42501 permission denied for table faculty` — rejecting the entire statement,
  not just that column. Before adding a column, check:

  ```sql
  SELECT grantee, count(*) FROM information_schema.column_privileges
  WHERE table_schema='public' AND table_name='<table>' AND privilege_type='SELECT'
  GROUP BY grantee;
  ```

  If that returns fewer columns than the table has, the table uses column-level
  grants and your migration must `GRANT SELECT (<new cols>) ON <table> TO anon,
  authenticated`. This blanked the public faculty directory on 2026-08-06 and
  looked intermittent, because sibling queries that happened not to name the new
  column kept returning 200.
- **Register new migrations in the test harness.** `npm run test:migrations`
  only executes the files listed inside `supabase/tests/verify-migrations.mjs`.
  A green run proves nothing about SQL that is not in that list. Add real
  assertions, not just "it applied".

## This repo lives in a OneDrive-synced folder

`git diff` after every edit. Files can be silently reverted or re-added by the
sync, including files you never touched — a `git stash` cycle has pulled in
changes to unrelated pages mid-session. Never assume "edit applied successfully"
means the change is on disk, and never assume the working tree still contains
only what you put there.
