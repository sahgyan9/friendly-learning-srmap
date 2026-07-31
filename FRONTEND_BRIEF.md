# Frontend brief: availability, private groups, welcome email

**Give this whole file to Claude Code on your desktop.** The backend for all
three features is already applied to the production Supabase project and
`src/integrations/supabase/types.ts` has already been regenerated — do not
re-run migrations and do not regenerate types. Everything below is frontend
work, plus one deploy step at the very end.

Read `.claude/rules/*` first. Screenshot and self-review every page you touch,
as those rules require.

---

## Ground rules for this change

1. **Never write `mentors.is_available`, `available_from` or `availability_note`
   directly.** Use the `set_mentor_availability` RPC. Writing the columns by
   hand is how "pause for 7 days" becomes a permanent disappearance with a
   forgotten deadline.
2. **Never write `community_members` directly for a private group**, and never
   flip `community_join_requests.status` from the client. Use the RPCs. They do
   the settle-and-join in one transaction; two client calls leave an approved
   request with no membership behind it whenever the second one fails.
3. A **private group is still listed**. Do not filter it out of the directory.
   What changes is the button and whether the posts render.
4. Match the existing code. This repo writes real comments explaining *why*, not
   what. Follow that. Don't add narration like `// set state`.

---

# Feature 1 — Mentor availability

## What is broken today

`src/pages/UserProfile.tsx:607-623` renders an "Available for Connections"
dropdown. It writes `users.is_available`. **Nothing has ever read that column.**
The mentor directory reads `public.mentors`, which until now had no availability
column at all. So the control has been decorative since June 2025: a mentor who
set themselves to "No" stayed listed and kept getting Connect requests.

`MentorCard.tsx` shows no availability anywhere. `MentorProfile.tsx` shows none.

## What the backend now provides

On `public.mentors`:

| column | type | meaning |
|---|---|---|
| `is_available` | `boolean not null default true` | master switch |
| `available_from` | `timestamptz null` | when a timed pause ends |
| `availability_note` | `text null`, ≤120 chars | optional "Back after end-sems" |

The three states:

| state | `is_available` | `available_from` | listed? |
|---|---|---|---|
| Available | `true` | `null` | yes |
| Paused until a date | `false` | future timestamp | no, until it passes |
| Paused indefinitely | `false` | `null` | no, until they turn it on |

A pg_cron job (`resume-mentor-availability`, every 15 min) relists mentors whose
`available_from` has passed and clears the note. **The read filter must also
treat an elapsed `available_from` as available**, so a pause ends when it is due
rather than up to 15 minutes later. Both are needed; do not drop one.

### RPC

```ts
supabase.rpc("set_mentor_availability", {
  p_available: boolean,
  p_days: number | null,   // 1..365; null while pausing = indefinite; ignored when p_available
  p_note: string | null,   // trimmed, truncated to 120; cleared on resume
})
// returns a single row: { is_available, available_from, availability_note }
```

It only ever edits the caller's own row. Resuming clears the deadline *and* the
note — a stale "back on the 15th" left showing after they return is worse than
no note.

## Work to do

### 1. `src/types/mentor.ts`

Add to `Mentor`:

```ts
  /** False hides them from the directory. Their profile URL still resolves. */
  is_available?: boolean;
  /** When a timed pause ends. Null while paused means "until I turn it back on". */
  available_from?: string | null;
  availability_note?: string | null;
```

### 2. `src/integrations/supabase/services/mentors.ts`

`getMentors()` and `searchMentors()` must both exclude paused mentors. Add to
each query, alongside the existing department filters:

```ts
.or(`is_available.eq.true,available_from.lte.${new Date().toISOString()}`)
```

Add a comment saying why the `or` is there and not just `is_available.eq.true`:
the cron job has not necessarily run yet, and a mentor whose pause expired two
minutes ago should already be back.

`getMentorById()` must **not** filter — a paused mentor's own profile page and
any existing link to it must keep working.

Add a helper the UI can share rather than re-deriving the rule in three places:

```ts
/** Mirrors public.mentor_is_listed. A pause whose deadline has passed is over. */
export function isMentorListed(m: Pick<Mentor, "is_available" | "available_from">): boolean {
  if (m.is_available !== false) return true;
  return !!m.available_from && new Date(m.available_from) <= new Date();
}
```

And a setter that wraps the RPC:

```ts
export async function setMentorAvailability(
  available: boolean,
  days: number | null,
  note: string | null,
) { /* supabase.rpc("set_mentor_availability", ...) */ }
```

### 3. `src/components/MentorCard.tsx`

A paused mentor is normally filtered out of the grid, so this matters in the two
places they still appear: the mentor's own view of themselves, and any cached or
directly-linked list.

- When `!isMentorListed(mentor)`, render a muted **"Taking a break"** badge in
  the existing badge row (the `flex flex-wrap items-center gap-1.5` block at
  ~line 145, next to the Alumni / New Mentor badges). Use neutral grey —
  `bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`. Do **not**
  use red or a warning colour; being on a break is not an error state.
- Disable the **Connect** button and change its label to **"Unavailable"**.
- Keep the card clickable through to the profile.

### 4. `src/pages/MentorProfile.tsx` + `src/components/mentor-profile/`

For a paused mentor, show a calm banner above the content:

> **Taking a break** — *{availability_note if set}*
> {Name} isn't accepting new connection requests right now.
> {If `available_from`: "Back on {date}." }

Disable the Connect / Message action on this page too. If the viewer is looking
at **their own** paused profile, say so differently — they need to know it is
their own setting and where to change it:

> **Your profile is paused** — you're hidden from the mentor directory.
> {Back on {date} | You'll stay hidden until you turn this back on.}
> [Resume now]

`[Resume now]` calls `setMentorAvailability(true, null, null)`.

### 5. `src/pages/UserProfile.tsx` — replace the dead control

Delete the `is_available` yes/no `<Select>` at lines ~607-623 and its
`profile.is_available` handling in the save path (line ~265). It writes the wrong
table. Replace it with a real control, only rendered when the user is a mentor:

```
Availability
( ) Available — students can find and message you
( ) Take a break
      When should you come back?
      [ 1 day ] [ 7 days ] [ Until I turn it back on ]      <- segmented control
      Note (optional)  [ Back after end-sems            ]   <- max 120 chars
```

Behaviour:
- Selecting **Available** calls `setMentorAvailability(true, null, null)`
  immediately and shows `toast.success("You're back in the directory")`.
- Selecting a break duration calls `setMentorAvailability(false, days, note)`
  where days is `1`, `7`, or `null`.
- Show the current state when paused: *"Hidden from the directory. Back on
  {date}."* or *"Hidden from the directory until you turn this back on."*
- Reassure, near the control, in small muted text: **"You stay a mentor and your
  existing conversations carry on — you just stop appearing in the directory."**
  This matters. Without it people think pausing deletes their profile and so
  never use it.
- This control saves on its own via the RPC. Do **not** fold it into the main
  profile form submit.

---

# Feature 2 — Public and private groups

## Intent

A private group is **still listed and searchable** — name, description, kind,
member count all visible, exactly like a public one. That is what makes it
joinable at all. Two things change:

1. **Joining goes through the owner** — by request or by invitation.
2. **The posts inside are members-only.**

Point 2 is enforced in the database across all four read paths (RLS on
`community_posts` / `post_comments` / `post_likes`, plus the five SECURITY
DEFINER RPCs that bypass RLS). You cannot leak it from the frontend by mistake —
a non-member simply gets zero rows. Your job is to render that state as a
deliberate screen instead of an empty feed that looks broken.

## What the backend now provides

`communities.visibility` — `'public'` (default) or `'private'`.

### Changed RPC return columns

`list_communities(...)` gained: `visibility`, `viewer_has_requested`,
`viewer_has_invite`.

`get_community(p_slug)` gained: `visibility`, `viewer_can_view`,
`viewer_has_requested`, `viewer_has_invite`, `pending_request_count`.

`viewer_can_view` is the one that decides whether to render posts. It is `true`
for every public group and for members/owner/admins of a private one.

`pending_request_count` is only non-zero for the owner (and admins) — use it for
a badge on the requests tab.

### New RPCs

```ts
supabase.rpc("request_to_join_community", { p_community_id: string, p_message?: string })  // -> request uuid
supabase.rpc("decide_join_request",       { p_request_id: string, p_approve: boolean })    // owner only
supabase.rpc("invite_to_community",       { p_community_id: string, p_user_id: string })   // owner only -> invite uuid
supabase.rpc("respond_to_invite",         { p_invite_id: string, p_accept: boolean })      // invitee only
supabase.rpc("list_join_requests",        { p_community_id: string })
//   -> { id, user_id, name, profile_image, is_mentor, message, created_at }[]
supabase.rpc("list_my_invites")
//   -> { id, community_id, community_name, community_slug, invited_by_name, created_at }[]
```

These raise Postgres exceptions with readable messages ("You already have a
request waiting on this group", "Only the group owner can invite people"). Surface
`error.message` in the toast rather than a generic string — the messages are
written to be shown.

Approving both settles the request **and** creates the membership in one
transaction, and notifies the person. Accepting an invite does the same. Do not
also insert into `community_members` yourself.

## Work to do

### 1. `src/integrations/supabase/services/communities.ts`

- Add `visibility: "public" | "private"` and the new viewer flags to the
  `Community` type and to `toCommunity()`.
- Add `CreateCommunityInput.visibility`, defaulting to `"public"`, and pass it
  through `createCommunity`.
- Add typed wrappers for the six RPCs above, following the existing
  `{ data, error }` convention used by the rest of this file.
- Add types `JoinRequest` and `MyInvite`.

### 2. `src/components/communities/CreateCommunityModal.tsx`

Add a visibility choice. Two cards/radios, not a bare checkbox — the difference
needs a sentence each:

> **Open** — anyone signed in can join and read the posts.
> **Invite only** — your group still shows in the directory, but people have to
> ask to join and only members can read the posts.

Default to **Open**. Most groups should be.

### 3. `src/components/communities/CommunityCard.tsx`

- Private groups get a small lock icon + **"Invite only"** next to the kind
  badge. Muted, not alarming.
- The action button depends on the viewer:
  - member → existing behaviour
  - public, not a member → **Join** (existing)
  - private, `viewer_has_invite` → **Accept invite**
  - private, `viewer_has_requested` → **Requested** (disabled)
  - private, otherwise → **Request to join**

### 4. `src/pages/CommunityDetail.tsx`

When `viewer_can_view` is false, do **not** render the post feed, the composer,
or the member list. Render a locked state instead. Keep the header — name,
description, kind, member count, owner — visible, because that is what someone
decides on:

> 🔒 **This group is invite only**
> Members can see the posts here. Ask {owner name} to join and they'll get a
> notification.
>
> [ Request to join ]   ← opens a small dialog with an optional message, ≤300 chars
>
> *…or, if `viewer_has_requested`:*
> **Request sent.** You'll get a notification when {owner name} replies.

Copy guidance: don't say "You do not have permission" or "Access denied". Nobody
did anything wrong. Say what the group is and how to get in.

### 5. Owner's requests panel — `src/pages/CommunityDetail.tsx`

When `viewer_is_owner` and the group is private, add a **Requests** tab
(badge = `pending_request_count`). List from `list_join_requests`: avatar, name,
mentor badge, their message, how long ago. Each row gets **Approve** / **Decline**
calling `decide_join_request`. Optimistically remove the row, and refetch the
community so `member_count` and the badge update.

Empty state: *"No one's asked to join yet. Invite someone from the members tab."*

### 6. Invites

- **Sending:** on the members tab, owner of a private group gets **Invite
  someone**. A dialog with a user search → `invite_to_community`. There is no
  user-search RPC yet; use the existing search in `src/components/search/` if it
  can return user ids, and if it cannot, say so and stop rather than inventing a
  new SECURITY DEFINER function — that would need a backend review.
- **Receiving:** surface `list_my_invites()` where the user will see it. The
  notifications area (`src/components/notifications/`) is the natural home;
  a small "Invitations" section on `/communities` also works. Each has
  **Accept** / **Decline** → `respond_to_invite`. On accept, navigate into the
  group.

---

# Feature 3 — Mentor welcome email

**No frontend work.** It is fully wired in the database: approving a mentor
application queues one email, once per mentor, on both the auto-approve and
admin-approve paths, respecting the existing email opt-out and one-click
unsubscribe.

Two deploy steps remain, listed at the end of this file. Until the function is
deployed, queued welcome rows sit unsent rather than being lost — the sender
now leaves unrecognised kinds alone instead of consuming them.

---

# Verification before you call any of this done

- [ ] `npx tsc --noEmit` clean.
- [ ] Pause yourself for 1 day → you vanish from `/mentors`, your own profile
      still loads and says paused, Connect is disabled on both card and profile.
- [ ] Resume → you reappear immediately, note is gone.
- [ ] Create a **public** group → behaves exactly as before. This is the
      regression that matters most; public groups and the open board must be
      untouched.
- [ ] Create a **private** group as a mentor. Sign in as a different student:
      the group is listed, the posts are not shown, the button says
      "Request to join".
- [ ] Request → owner sees it in Requests with a badge → approve → the student
      is a member, gets a notification, and can now see and write posts.
- [ ] Sign out entirely: the private group still appears in the directory, its
      posts do not.
- [ ] Screenshot every page you touched and review it, per `.claude/rules`.
