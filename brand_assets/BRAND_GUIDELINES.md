# Friendly Learning SRMAP — Brand Guidelines

Single source of truth for anything that puts the Friendly Learning name or mark
in front of someone outside the app: welcome emails, certificates, social
previews, PDFs. The in-app UI already gets this right via Tailwind + CSS
variables (`src/index.css`, `tailwind.config.ts`) — this doc exists for the
surfaces that *don't* get to use those, and have been drifting because there
was nowhere written down to check.

If you change a color, font, or the logo file, update this doc in the same
change. This doc is the reason to stop guessing hex codes from a screenshot.

---

## 1. Logo

**Raster source:** [`logo-mark-light-bg.png`](logo-mark-light-bg.png) (copy of
`public/lovable-uploads/df76e963-f250-4f25-8f7b-3917f857fe63.png`, the file the
live app actually serves — keep these two in sync).

**Vector versions:** [`logo-mark-light-bg.svg`](logo-mark-light-bg.svg) and
[`logo-mark-dark-bg.svg`](logo-mark-dark-bg.svg) — traced pixel-for-pixel from
the PNG above (three flat-fill paths: bracket, F, L), so they scale cleanly
for favicons, print, and anywhere a raster would look soft. Prefer these over
the PNG for any new use; the PNG stays only because `Logo.tsx` and existing
emails already reference it.

- Two-tone wordmark: an **F** in brand blue and an **L** in dark navy, on a
  **transparent** background, wrapped in a black bracket/connector motif.
- Exact inks (measured from the source pixels, superseding any earlier hex
  recorded here): `#3963C6` (blue F, same as `--primary`), `#374151` (navy L),
  `#000000` (bracket).
- No wordmark baked into the image — "Friendly Learning SRMAP" is set as live
  text next to the mark wherever it's used (see `Logo.tsx` and the certificate
  SVG), not part of the image.

### Light vs. dark background versions

`logo-mark-light-bg.svg` uses the exact source inks above and is for white or
near-white surfaces (`#FFFFFF`–`#F8FAFC`), same rule as the PNG always had.

`logo-mark-dark-bg.svg` uses the brand blue (`#3963C6`) for **F**, while **L** and the bracket are rendered in crisp white (`#F8FAFC`) so they stay clean and legible against dark surfaces.

If a colored (non-dark-theme) background comes up that neither SVG suits, put
the light-bg mark inside a small white/near-white chip or card rather than
placing it directly on the color.

### Clear space & sizing
- Minimum clear space around the mark: half the mark's own height, on all sides.
- Minimum display height: 28px (email/web), 32px (print/certificate). Below
  that the F/L strokes start to fill in.
- Never stretch non-uniformly, never recolor the two inks to match a random
  accent, never drop a drop-shadow onto it.

---

## 2. Color palette

Source of truth is `src/index.css` (`--variable: H S% L%` in HSL, consumed via
`hsl(var(--x))` in Tailwind). Anything outside the Vite/Tailwind build (raw
HTML emails, the certificate SVG's plain `fill="#..."` attributes) can't read
CSS variables, so those surfaces need the resolved hex below — recompute this
table if the CSS variables change, don't hand-copy from an old screenshot.

### Light (default for anything sent externally — email, certificate, PDF)

| Token | HSL (from index.css) | Hex | Use |
|---|---|---|---|
| `--primary` | `222 55% 50%` | `#3963C6` | Brand blue. Buttons, links, the "F" ink. |
| `--foreground` | `222 47% 11%` | `#0F1729` | Body text on white. |
| `--background` | `210 40% 98%` | `#F8FAFC` | Page/email background (not card). |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card / email body surface. |
| `--secondary` | `210 40% 96%` | `#F1F5F9` | Muted section backgrounds. |
| `--muted-foreground` | `215 16% 45%` | `#607085` | Secondary text, captions. |
| `--border` | `214 32% 91%` | `#E1E7EF` | Hairlines, card borders. |
| `--destructive` | `0 84% 60%` | `#EF4343` | Errors / revoked states only. |

Navy ink (the "L", and certificate headline text) is `#0F172A` (Tailwind
`slate-900`) — one step darker than `--foreground`; used deliberately for
print contrast, not a CSS variable.

### Dark (in-app only — do not use for email or certificate, both are
external documents meant to look the same regardless of the recipient's
system theme)

| Token | HSL | Hex |
|---|---|---|
| `--background` | `222 47% 11%` | `#0F1729` |
| `--foreground` | `210 40% 98%` | `#F8FAFC` |
| `--card` | `240 10% 8%` | `#121216` |
| `--secondary` | `217 33% 18%` | `#1F2A3D` |
| `--border` | `217 33% 25%` | `#2B3B55` |

### Approved email accent (not a CSS variable — a documented exception)

The welcome email header uses a gradient that is close to but not identical
to `--primary`, chosen because a single flat blue banner read as flat in
testing and the two extra stops read as more "you did it" without leaving the
brand's blue family:

```
linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)   /* indigo-600 → violet-600 */
```

Keep this exact pair for any future transactional email header so they read as
one family. Don't invent a third gradient per-email.

### Certificate-only gold

The certificate's seal/border gold is **not** a brand color — don't reuse it
in emails or UI. It exists only to read as "certificate" the way a wax seal
does:

```
linear-gradient stops: #fef08a → #f59e0b → #b45309 → #f59e0b → #fef08a
```

---

## 3. Typography

No webfont is loaded anywhere in this project (checked `index.html`,
`src/index.css` — no `@font-face`, no Google Fonts `<link>`). Everything runs
on the system stack:

```
-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif
```

Use exactly that stack (already the standard in `welcome-email.ts`) in any new
HTML email — it's the one stack guaranteed to render without a broken
`@font-face` fetch inside an email client.

The certificate is the one exception: it's a static SVG raster, not something
recipients' fonts need to resolve, so it pairs the system sans above with
`Georgia, 'Times New Roman', serif` for the headline/name (serif reads as
"certificate", sans stays legible for stats/footer). Don't add serif anywhere
else.

---

## 4. Voice & tone

Pulled from the existing welcome email and certificate copy — keep new copy
consistent with this, don't default to generic "corporate warm":

- **Talk about what changed, not the platform.** "Your mentor profile just
  went live" beats "Welcome to our platform."
- **Be specific with numbers, not vague with adjectives.** "Help 3 students —
  meaning they actually reply" beats "engage with the community."
- **Undercut formality on purpose.** "Nobody's expecting office hours" is the
  house move: name the anxiety, then say it's smaller than it sounds.
- **First person, singular, signed.** Emails are signed "Gyan & The Friendly
  Learning Team," not "The Friendly Learning Team" — this is a studentrun
  platform and should read like one person wrote it, not a company.
- Never claim university affiliation. It's "SRM University AP" as a *location*
  in copy (department/university line), never as an issuer. The certificate
  intro comment in `MentorCertificate.tsx` says this outright — it's binding,
  not incidental.

---

## 5. Email component tokens

Reusable pattern from `src/components/admin/verification/welcome-email.ts`,
worth keeping literal across future transactional emails:

- Outer wrapper: `#f4f6f8` background, `24px 12px` padding.
- Card: `max-width:600px`, `#ffffff`, `border-radius:16px`,
  `box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05)`.
- Header: the approved gradient (§2), `32px 28px` padding, center-aligned.
- Section cards: `1px solid #e2e8f0` border, `12px` radius, `16px` padding.
- Primary CTA button: `background-color:#4f46e5`, white text, `6px` radius,
  `8px 16px` padding — matches the header gradient's start color so buttons
  read as "the same blue" as the banner above them.
- Footer: `#f8fafc` background, `1px solid #e2e8f0` top border, centered,
  `12px`/`13px` muted text.

## 6. Certificate design tokens

- Outer sheet: `#ffffff`, double gold/navy border frame (`§2` gold gradient +
  `#1e293b`).
- Headline serif color: `#0f172a`. Body sans color: `#334155`/`#64748b` by
  hierarchy.
- Stat boxes: `#f8fafc` fill, `#cbd5e1` border, gold top accent bar.
- Certificate number / issued date: `#94a3b8` label, `#334155` value.

---

## 7. Known gaps (tracked here so they don't get silently reintroduced)

- **Certificate gold is print-only.** Confirmed above, repeating so it's not
  missed: don't let it leak into email or UI as "the brand accent."
- ~~`Logo.tsx` still ships the raster PNG with a CSS filter~~ — done. `Logo.tsx`
  now renders `/logo-mark-light.svg` and `/logo-mark-dark.svg` (copied into
  `public/` from this folder) side by side, swapped with `dark:hidden` /
  `dark:block`. No more CSS filter, no more raster PNG in the header. Verified
  in both themes by checking computed `display` on both `<img>`s after
  toggling the site's theme switch — light SVG shows in light mode, dark SVG
  in dark mode, and only one is ever in the accessibility tree at a time.
  The welcome email and certificate are unchanged on purpose (see §1's
  email-compatibility note, and the certificate's LOGO_DATA_URL is a separate
  base64 PNG embed not covered by this swap).

---

## 8. Page hero header pattern

All feature pages (Faculty, Events, Groups, Posts) share a standardised hero
header that mirrors the FeaturesShowcase card design language. Keep new pages
consistent with this pattern.

### Structure

```tsx
<div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-{accent}/5 via-background to-background">
  {/* Decorative blobs */}
  <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-{accent}/8 blur-3xl" />
  <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-{accent}/5 blur-2xl" />

  <div className="container mx-auto px-4 pb-8 pt-28">
    <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
      {/* Pill label */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-{accent}/20 bg-{accent}/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-{accent}-600 dark:text-{accent}-400">
        <FeatureIcon className="h-3.5 w-3.5" />
        NN — Feature Name
      </div>

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Page Title</h1>
      <p className="mt-2 max-w-2xl text-base text-muted-foreground">One sentence.</p>
    </motion.div>
  </div>
</div>
```

### Feature-to-accent mapping (matches FeaturesShowcase)

| Feature | Number | Icon | Accent colour |
|---------|--------|------|---------------|
| Mentors | 01 | `GraduationCap` | `text-[#3963C6]` (brand primary) |
| Messaging | 02 | `MessageSquare` | `sky` |
| Events | 03 | `CalendarDays` | `violet` |
| Faculty | 04 | `BookOpen` | `rose` |
| Groups | 05 | `Users` | `amber` |
| Posts | 06 | `FileText` | `emerald` |
| Matching | 07 | `Lightbulb` | `orange` |
| Certificates | 08 | `BadgeCheck` | `teal` |
| Attendance | 09 | `GraduationCap` | `emerald` / `text-[#3963C6]` |

### Card hover glow (FeaturesShowcase-consistent)

Every card that links to a feature page carries a hover glow overlay. Add to
`<Card>` or the outermost wrapper:

```tsx
className="group relative overflow-hidden ... hover:border-primary/30"
// Inside:
<div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/3 to-transparent" />
```

The glow uses `--primary` (brand blue) regardless of the feature accent colour
— the accent lives in the pill label and icon, not the hover state. This keeps
hover behaviour visually unified across all cards on the same page.

---

## 9. Card design system

All feature cards share a consistent set of micro-patterns. Apply them whenever building a new card.

### 9.1 CardAccentBorder

A 2px solid gradient strip at the top of every card, rendered with `<CardAccentBorder>` from
`@/components/ui/CardAccentBorder`. The component applies `opacity-40` internally so it reads as
a subtle accent rather than a heavy coloured bar.

```tsx
<Card className="relative overflow-hidden ...">
  <CardAccentBorder gradient="violet" />
  ...
</Card>
```

Available gradient keys and their mapped colours:

| Key | Gradient | Used for |
|-----|----------|----------|
| `primary` | blue → indigo | Mentors, default |
| `rose` | rose → pink | Faculty |
| `emerald` | emerald → teal | Posts (feed), Research type |
| `amber` | amber → orange | Groups, Hackathon type |
| `violet` | violet → purple | Events (all cards) |
| `sky` | sky → cyan | Messages, Study Help type |
| `orange` | orange → amber | Announcements type |
| `muted` | border → border | General / neutral |

### 9.2 Card hover recipe

Every interactive card uses the same three-layer hover treatment:

```tsx
// 1. Card wrapper
className="group relative overflow-hidden transition-all duration-300
           hover:-translate-y-0.5 hover:shadow-lg hover:border-{accent}/30"

// 2. Glow overlay — first child inside Card, after CardAccentBorder
<div className="pointer-events-none absolute inset-0 rounded-xl opacity-0
                group-hover:opacity-100 transition-opacity duration-500
                bg-gradient-to-br from-{accent}/5 to-transparent" />

// 3. Title text
className="transition-colors duration-200
           group-hover:text-{accent}-600 dark:group-hover:text-{accent}-400"
```

### 9.3 Card footer pattern

Cards with a primary action use a `border-t border-border/60` footer section.
This separates meta (author, date, stats) from the CTA and gives breathing room.

```tsx
<div className="relative flex items-center justify-between gap-3
                border-t border-border/60 px-4 py-2.5">
  {/* secondary meta */}
  {/* primary CTA */}
</div>
```

### 9.4 Events page — PostCard category colours

Marketplace/Events posts are colour-coded by category within the Events page:

| Category | Border gradient | Badge style |
|----------|----------------|-------------|
| `events` | `violet` | `bg-violet-500/10 text-violet-600 border-violet-500/20` |
| `news` | `sky` | `bg-sky-500/10 text-sky-600 border-sky-500/20` |
| `ads` | `amber` | `bg-amber-500/10 text-amber-600 border-amber-500/20` |
| `courses` | `emerald` | `bg-emerald-500/10 text-emerald-600 border-emerald-500/20` |

SRMAPEventCard (official events): violet accent throughout, Live badge violet, department
badge with `bg-violet-500/8 text-violet-600 border-violet-500/20`.

### 9.5 Community Posts — per-type top border

PostCard derives its `CardAccentBorder` gradient from `post_type`:

| post_type | gradient key |
|-----------|-------------|
| `hackathon` | `amber` |
| `study-help` | `sky` |
| `project` | `violet` |
| `research` | `emerald` |
| `problem-solving` | `rose` |
| `announcement` | `orange` |
| `general` | `muted` |

Additional Posts brand colour tokens:
- Tags: `bg-emerald-500/8 text-emerald-700 border-emerald-500/20`
- Avatar fallback: `bg-emerald-500/10 text-emerald-700`
- Comment button hover: `hover:text-emerald-600 dark:hover:text-emerald-400`
