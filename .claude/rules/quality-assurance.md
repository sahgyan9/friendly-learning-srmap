# Quality Assurance

- **Run the cheap checks on every change:** `npm run typecheck` (must stay at 0
  errors), `npx eslint <files you touched>` (add no new errors), and `npm test`
  when you changed logic that has tests.
- **Screenshot only when the change is visual**, and then at 360px and desktop
  in both themes, using the harnesses in `scripts/qa/`. Browser and agent-driven
  verification spends the owner's usage, so do not run it for non-visual
  changes (docs, types, server-only code).
- **Verify data changes against the data**, not the HTTP status. See
  `supabase-changes.md`.
