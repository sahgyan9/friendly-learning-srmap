# Behavioral recommendations — parked idea

Not started. Parked here 2026-08-07 so the reasoning survives until someone
picks it up, instead of getting re-derived from scratch or, worse, started
directly as an ML project when it shouldn't be one yet.

**The idea, in one sentence:** an Amazon/LinkedIn-style feed that learns from
what a user actually does — not just their stated interests — and ranks
opportunities, posts, and mentors accordingly. The pitch for why this fits
this product specifically: a two-sided mentor marketplace already produces
higher-intent behavioral signal than a generic content feed does (messaging a
mentor is a much stronger signal than a pageview), so the data is unusually
good for what it is, even though the volume is small.

## Why not now

Collaborative filtering — "people who did what you did also liked X" — needs
real interaction volume to find anything but noise. Checked against the live
DB on 2026-08-07: dozens of users, tens of messages, single-digit welcome
emails. At this scale, a collaborative model has nothing to collaborate on; it
would confidently rank on statistical accidents.

## What already exists to build on, when it's time

Verified in the schema, not assumed:

- **`opportunities.tags`** (`text[]`, GIN-indexed) — hackathons/competitions,
  tagged the same way `faculty.interests` is, explicitly so retrieval can match
  without a maintained keyword list. See `20260806190000_opportunities.sql`.
- **`opportunity_interest`** — one tap, "I'm interested," with an optional free
  -text note ("looking for a designer"). Real intent, not a pageview.
- **`messages`** — who messaged whom, and `is_read`. Already read by
  `send-email-queue` to decide whether a notification is stale; the same
  read/reply behavior is a natural strength-of-relationship signal.
- **Department and interest fields** on `users`/`mentors` — explicit profile
  data, no inference needed.

## The recommendation for whenever this gets built

Skip ML at the start. Build a **content-based scoring function**: something
like `score = w1*(tag overlap with stated interests) + w2*(posted or tagged by
a mentor you've messaged) + w3*(department match) + w4*(recency) + w5*(others
in your circle already interested)`. This is transparent — you can tell a user
why they saw something, which matters for trust in a small community product
— cheap to compute, and degrades gracefully with near-zero data, which
collaborative filtering does not. Revisit real collaborative filtering once
there's an actual interaction log worth mining (thousands of logged actions,
not tens) — and by then the log already exists, because the signals above are
what would have been collecting it.

## Open questions, not yet decided

- **Where does a ranked list surface?** Existing product precedent
  ([[search-lives-where-traffic-is]] in memory) is to extend a surface people
  already use rather than build a new destination page — e.g. re-rank the
  existing opportunities/posts feed rather than a new "For You" page. Not
  confirmed this applies here; worth deciding deliberately, not by default.
- **Cold start.** A brand-new user has no behavior to rank on. Falls back to
  the content-based score's non-behavioral terms (department, recency) until
  there's something to learn from — needs to be designed in from the start,
  not patched on later.
- **Does "event" in the original conversation mean `opportunities` only, or
  also community posts?** Assumed both are in scope for the scoring function
  above; not explicitly confirmed.
