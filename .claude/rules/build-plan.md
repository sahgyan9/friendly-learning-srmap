# There is a build plan, and it is the plan of record

[FABLE_BUILD_PLAN.md](../../FABLE_BUILD_PLAN.md) is the agreed plan for this
project's build priorities, written and executed 2026-08-08/09 by Claude Fable
5 with Gyan's approval. **Read it before proposing work, and especially before
writing a competing plan.**

Use it when:

- Gyan refers to "the plan", "the plan Fable made", or a task ID like `T2.3`.
  The IDs are defined there; use the same ones rather than renumbering.
- You are about to suggest what to build next. Ten of its eleven tasks are done
  and in production; the file lists what remains, what was deliberately
  deferred and why, and the follow-ups discovered during execution (notably:
  **link previews are broken for every dynamic route**).
- You are picking up implementation. It carries the hard-won rules that are not
  obvious from the code — the typecheck baseline of 13, the SKIP-list
  obligation for pgvector migrations, the three edits required to add a search
  entity type, and the fact that `@/hooks/use-toast` is silently dead in this
  app.

It defers to [FACULTY_AI_ROADMAP.md](../../FACULTY_AI_ROADMAP.md) on anything
retrieval- or AI-related; that file stays the deeper authority there.

This repo is also worked on by other agent tools, so the same guidance exists
in tool-neutral form at [AGENTS.md](../../AGENTS.md) (read by Antigravity,
Codex, Cursor, Gemini CLI) with a matching pointer at `.agent/rules/`. If you
change a rule that AGENTS.md repeats, change it there too — three copies drift
fast.

Keep it current: when a remaining task ships, update its row in the status
table and move its entry out of "What is left" in the same commit.
