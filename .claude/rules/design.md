# Design Rules

This is a Vite + React + Tailwind app with an existing token system. Use it;
do not introduce new colours, fonts, or a CDN build.

- **Tokens live in `src/index.css`** (HSL CSS variables for light and `.dark`)
  and are exposed through `tailwind.config.ts`. Style with `bg-background`,
  `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary` and
  so on, never raw hex values.
- **Type is Plus Jakarta Sans** (`font-sans` / `font-display`). Stay on the
  Tailwind type scale, including the project's `text-2xs` (11px) and `text-3xs`
  (10px).
- **Spacing on Tailwind's 4px grid.** Use `gap-*` on flex/grid parents rather
  than per-child margins.
- **Brand rules are in `brand_assets/BRAND_GUIDELINES.md`**, including the
  `CardAccentBorder` convention and the non-affiliation rule.
- **No decorative emoji in UI copy** (buttons, toasts, notifications, emails).
  Use Lucide icons. Emoji that users send each other are content and fine.
- **Every page works at 360px** and in both light and dark themes. Bare `grid`
  and flex children need `min-w-0` or long content widens the page.
