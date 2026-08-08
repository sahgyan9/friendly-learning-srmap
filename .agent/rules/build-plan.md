# Read the plan of record before proposing work

**Start with [AGENTS.md](../../AGENTS.md) in the project root** — it is the
portable brief for this repo: stack, commands, the rules that will cost you a
day if you skip them, and the settled product red lines. It stands alone; you
do not need any other tool's config directory.

**[FABLE_BUILD_PLAN.md](../../FABLE_BUILD_PLAN.md) is the agreed build plan.**
Written and executed 2026-08-08/09 with the owner's approval. If Gyan refers to
"the plan", "the plan Fable made", or a task ID like `T2.3`, that is the file.
Ten of its eleven tasks are shipped and live; it records what remains, what was
deliberately deferred and why, and the follow-ups found while building — chiefly
that **link previews are broken for every dynamic route** (a shared faculty,
opportunity, or blog link previews as the homepage).

Use its task IDs rather than renumbering, and update its status table in the
same commit that ships a task.

## Three things worth repeating here

- **`npm run typecheck` is the check** — bare `tsc` is a no-op in this repo, and
  the baseline is **13 known pre-existing errors, not zero**. ESLint is broken
  repo-wide; skip it.
- **Frontend, database, and edge functions are three separate deploy targets.**
  Shipping one never ships the others, and HTTP 200 is not proof a function did
  its job — verify that the data actually changed.
- **This repo lives in a OneDrive-synced folder.** Run `git diff` after every
  edit; files can be silently reverted, including ones you never touched.

Gyan is non-technical and delegates execution decisions, so prefer making a
clear recommendation and proceeding over presenting options — but stop for
anything destructive or genuinely out of scope.
