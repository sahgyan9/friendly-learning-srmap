# Site search — how it works and how to change it

The search box in the navbar covers three different things at once:

1. **Pages** — every route on the site, including ones the navbar has no room for.
2. **People and content** — mentors, the 619 lecturers, board posts, blog articles.
3. **Actions** — things that aren't pages, like switching the theme or opening the bell.

Open it by clicking the box, or with **Ctrl+K** (**⌘K** on a Mac).

---

## The important idea: people search for what they want, not what we called it

A fresher who needs help types **"senior"**, not "mentor". Someone whose page is
broken types **"bug"**, not "contact". Someone curious about the project types
**"aim"**, not "about".

If those return nothing, the search feels broken — and someone who searches once
and gets nothing does not search again. So every page carries a list of the words
people might actually use for it. That list is called `keywords`.

Some of the ones already set up:

| Someone types… | They land on |
| --- | --- |
| senior, buddy, guide, tutor, doubt | Mentors |
| professor, prof, sir, madam, teacher, rating | Faculty |
| bug, issue, broken, not working, complaint, feedback | Contact |
| aim, mission, purpose, why, who we are, story | About |
| dm, inbox, chat, conversation | Messages |
| dark, light, night mode, brightness, colour | Switch theme |
| teammate, sih, smart india hackathon | Hackathon partners |
| perks, benefits, what's in it for me, give back | Become a mentor |

---

## Where everything lives

| File | What it does |
| --- | --- |
| `src/lib/search/destinations.ts` | **The list you'll edit.** Every page and action, with its keywords. |
| `src/lib/search/rank.ts` | Decides which destination wins when several match. |
| `src/hooks/useSiteSearch.ts` | Fetches live results — mentors, faculty, posts, blog. |
| `src/components/search/SiteSearch.tsx` | The box in the navbar and the popup. |
| `src/lib/search/events.ts` | How search opens the notification bell (there's no notifications page). |

---

## How to add a new page to search

Add one entry to `DESTINATIONS` in `src/lib/search/destinations.ts`:

```ts
{
  id: "study-groups",                    // unique, anything you like
  label: "Study groups",                 // what people see
  hint: "Join a group revising your subject",  // the small grey line underneath
  icon: BookOpen,                        // any lucide-react icon, imported at the top
  group: "Go to",                        // the heading it appears under
  keywords: ["study group", "group", "revision", "revise together"],
  to: "/study-groups",                   // the route
}
```

That's it. No other file needs touching.

### Restricting who sees it

Add an `audience` list. The entry shows if **any** rule matches.

```ts
audience: ["signedIn"]   // only when logged in
audience: ["admin"]      // only for admins
audience: ["mentor"]     // only for people who are already mentors
audience: ["notMentor"]  // only for people who aren't — e.g. "Become a mentor"
audience: ["signedOut"]  // only for logged-out visitors — e.g. "Sign in"
```

Leave `audience` off entirely and everyone sees it.

> This is for **tidiness, not security**. Hiding the admin entries stops the menu
> being cluttered for normal students; it is not what stops them reaching
> `/admin`. That's `ProtectedRoute` and the database's row-level security, and it
> stays true whether or not the entry is listed here.

---

## How to add or change the keywords

Just add words to the `keywords` array. A few rules that keep the list useful:

- **Don't add plurals.** Matching is prefix-based, so `"mentor"` already answers
  "mentors". `"review"` already answers "reviews".
- **Write phrases the way people type them**, spaces and all: `"how does this work"`,
  `"whats in it for me"`. Punctuation is ignored on both sides, so don't bother
  with apostrophes.
- **Lowercase is fine** — everything is lowercased before matching.
- **Add misspellings people actually make**, not every possible one. `"maam"` is
  worth having; `"maaam"` is not.
- **Watch for collisions.** `"certificate"` currently sits on both *Become a
  mentor* and *My certificate*, which is deliberate — the audience rules mean
  only one of them is ever visible to a given person. If you put the same word on
  two entries that are both visible, whichever scores higher wins, and that will
  feel arbitrary.

---

## How the ranking works

When several entries match, `rank.ts` sorts them by how good the match is.
Highest to lowest:

1. Query **is exactly** the page's name → *"mentors"*
2. Page's name **starts with** the query → *"ment"*
3. Query **is exactly** one of the keywords → *"senior"*
4. A keyword **starts with** the query → *"prof"* matching `"professor"`
5. Any word inside the name starts with the query → *"partner"* matching "Hackathon partners"
6. The query appears **anywhere** in the name or a keyword
7. The query appears in the grey hint line
8. Last resort: the letters appear in order (only for 3+ characters)

Only the **top 6** page matches are shown, so live results (people and posts) always
have room. If a page you expect isn't showing up, it's almost always because six
other entries scored higher — check whether the query is in too many keyword lists.

---

## Live results

Mentors, faculty and board posts are fetched from the database; blog articles are
matched in the browser because they ship with the app.

Things worth knowing before changing `useSiteSearch.ts`:

- Nothing is fetched until **2 characters** are typed. One character matches
  hundreds of lecturers.
- Typing is **debounced by 220ms** — one request after you pause, not one per key.
- Responses carry a **sequence number** and stale ones are thrown away. Without
  it, a slow request for "an" can land after a fast one for "anjali" and replace
  the results you're looking at.
- **4 results per group**, so no single group can push the others off screen.
- Each source has its own `.catch`. If the posts query fails, mentors and faculty
  still appear.

### A note on filtering

cmdk (the library behind the popup) has its own built-in fuzzy filter. It is
**switched off** — `shouldFilter={false}`.

This matters. Database results arrive already filtered by the server. Running them
through a second filter in the browser would hide rows the query genuinely matched:
searching "anjali sharma" would find her row on the server, then cmdk would drop it
because the visible text didn't score well enough. With filtering off for one kind
of result it has to be off for all of them, which is why `rank.ts` exists.

---

## Things that aren't pages

An entry can run something instead of navigating. Use `action` instead of `to`:

```ts
{ id: "toggle-theme", /* … */ action: "toggle-theme" }
```

The two that exist:

- **`toggle-theme`** — flips dark/light. Deliberately leaves the popup open, since
  people usually toggle twice to compare.
- **`open-notifications`** — there is no `/notifications` route; the bell is a
  popover in the header. Search fires a window event (`fl:open-notifications`) and
  `NotificationBell` listens for it. This keeps the two components independent.

To add a third, add the id to `SearchActionId` in `destinations.ts` and a case to
the `switch` in `SiteSearch.tsx`.

---

## Testing a change

There's no test runner in this project yet, so check by hand. Open the search and
type each of these — the first result should be what's in brackets:

```
senior      (Mentors)
prof        (Faculty)
bug         (Contact & report a problem)
aim         (About Friendly Learning)
dark        (Switch to light/dark theme)
hackathon   (Hackathon partners)
Amit Roy    (a Faculty result)
zzzqqq      (the "nothing matched" message)
```

If you add a test runner later, this list is what to turn into assertions first —
these are the phrasings the whole design rests on.
