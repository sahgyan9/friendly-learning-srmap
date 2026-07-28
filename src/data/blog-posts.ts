/**
 * Blog content, authored by the team and versioned with the app.
 *
 * These are a handful of evergreen guides, not a feed — a database table and an
 * editor would be more machinery than three pages justify. The sitemap
 * generator reads this same module, so publishing is a single edit here.
 */

export interface BlogSection {
  heading?: string;
  /** Paragraphs of prose. */
  body?: string[];
  /** Rendered as a bulleted list under the paragraphs. */
  list?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date — used for <time>, Article schema and sitemap lastmod. */
  date: string;
  readingMinutes: number;
  tags: string[];
  /** Lead paragraph, shown under the title on the detail page. */
  standfirst: string;
  sections: BlogSection[];
  /** Optional in-app destination the post naturally leads to. */
  cta?: { label: string; to: string };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "choosing-electives-srm-ap",
    title: "How to Choose Your Electives at SRM AP Without Guessing",
    excerpt:
      "Course codes and credit counts tell you nothing about what a semester will actually feel like. Here's how to find out before you register.",
    date: "2026-07-20",
    readingMinutes: 6,
    tags: ["Electives", "Registration", "Faculty"],
    standfirst:
      "Registration opens, you have a week to decide, and the only information you have is a course code and a credit count. Most students end up asking whoever happens to be nearby. You can do better than that.",
    sections: [
      {
        heading: "The catalogue tells you the syllabus, not the semester",
        body: [
          "Two sections of the same course, taught by different faculty, can be completely different experiences. One might be project-heavy with generous grading; the other might live or die on a single end-semester exam. The course catalogue cannot tell you this, because the difference is not in the syllabus — it is in who teaches it.",
          "This is the single largest gap between what students need to know at registration time and what the university publishes. It is also the gap that word of mouth fills badly: you hear from the two seniors you happen to know, and their experience may not be representative.",
        ],
      },
      {
        heading: "Read the ratings before you commit",
        body: [
          "Friendly Learning carries the full SRM AP faculty directory — every department, synced directly from the university's own listings — with student ratings on teaching quality, grading fairness and helpfulness.",
          "Ratings are anonymous by design. Your name is never attached to a review and is never stored alongside one, which is the only way to get honest answers to a question like 'is this course graded fairly'.",
        ],
        list: [
          "Teaching quality — can they actually explain the material?",
          "Grading fairness — is the grade you get the grade you earned?",
          "Helpfulness — will they answer an email in week 11?",
        ],
      },
      {
        heading: "Weigh the three scores differently depending on the course",
        body: [
          "For a core course in your specialisation, teaching quality matters most — you will build on this material for years, and a shaky foundation is expensive to repair later.",
          "For an elective outside your department, helpfulness tends to matter more. You are the outsider in that room, and you will need someone willing to fill in the background you never covered.",
          "For anything that feeds into your CGPA at a critical moment, grading fairness is the score to read closely.",
        ],
      },
      {
        heading: "Then go ask someone who took it",
        body: [
          "Ratings narrow the field; a five-minute conversation closes it. Post on the community board asking whether anyone has taken the specific section you are considering. Students who have sat through the course know things no rating captures — how the assignments are actually weighted, whether attendance is enforced, what the exam looks like.",
        ],
      },
    ],
    cta: { label: "Browse faculty ratings", to: "/faculty" },
  },
  {
    slug: "finding-hackathon-teammates",
    title: "Finding Hackathon Teammates Who Actually Show Up",
    excerpt:
      "Most hackathon teams fall apart before the event starts. The fix is being specific about what you need, and asking early.",
    date: "2026-07-12",
    readingMinutes: 5,
    tags: ["Hackathons", "Team Building"],
    standfirst:
      "The team that wins is rarely the most talented one. It is the team where nobody disappeared two days before submission. Here is how to assemble one of those.",
    sections: [
      {
        heading: "Vague asks attract vague commitments",
        body: [
          "'Looking for hackathon partners, DM me' is the most common post on any student board, and it is close to useless. It tells nobody what you are building, what you need, or what they would be signing up for. The people who respond are the people who respond to everything, which is not the same as the people who will still be there at 3am on day two.",
          "Compare that to: 'Building a campus lost-and-found app for the January hackathon. I'll handle the backend. Need one person comfortable with React and one who can design screens. Roughly 15 hours over the weekend.' That post gets fewer replies, and every one of them is worth reading.",
        ],
      },
      {
        heading: "Say these four things",
        list: [
          "What you're building — even a rough idea beats none, and it filters for genuine interest.",
          "What you'll do yourself — this signals you're a contributor, not a recruiter.",
          "What you need — name the specific skills, not 'anyone interested'.",
          "How much time it takes — the single most common reason teams collapse is a mismatch here.",
        ],
      },
      {
        heading: "Ask three weeks out, not three days",
        body: [
          "The strongest potential teammates commit early, because they plan. By the time the event is a few days away, everyone worth having is already on a team, and you are choosing from whoever is left.",
          "Posting early also gives you time to have a short conversation with each person before committing. Fifteen minutes on a call will tell you more about whether someone will follow through than any list of skills.",
        ],
      },
      {
        heading: "Mix skills, not just people",
        body: [
          "A team of four backend developers will build something impressive that nobody can look at. The teams that place tend to cover three bases: someone who can build it, someone who can make it presentable, and someone who can explain why it matters in a three-minute pitch.",
          "That last role is chronically undervalued and is often the difference between a working project and a winning one.",
        ],
      },
    ],
    cta: { label: "Post on the community board", to: "/community-posts" },
  },
  {
    slug: "asking-for-academic-help",
    title: "Asking for Academic Help Without Feeling Awkward About It",
    excerpt:
      "The students who do best are not the ones who need the least help — they're the ones who ask earliest. A practical guide to asking well.",
    date: "2026-07-04",
    readingMinutes: 5,
    tags: ["Study Tips", "Mentorship"],
    standfirst:
      "There is a version of asking for help that feels like admitting defeat, and a version that feels like ordinary problem solving. The difference is mostly in timing and phrasing.",
    sections: [
      {
        heading: "Ask in week three, not week twelve",
        body: [
          "Almost every request for help arrives too late. A student struggles quietly through most of a semester, then asks for help once the gap has grown too wide to close before the exam.",
          "The uncomfortable truth is that the cost of asking never changes — it is a slightly awkward message either way — while the cost of not asking compounds every week. Week three is when a confusion takes twenty minutes to clear up. Week twelve is when the same confusion has become four topics you cannot follow.",
        ],
      },
      {
        heading: "Bring a specific question",
        body: [
          "'I don't understand dynamic programming' is hard to answer. 'I understand memoisation but I can't work out how to define the state for this problem' is a question someone can answer in five minutes.",
          "Doing the work of narrowing the question is also the fastest way to discover you can answer half of it yourself. Write out what you do understand, and the gap usually announces itself.",
        ],
        list: [
          "Say what you already tried — it stops you being walked through ground you've covered.",
          "Point at the exact step where it stopped making sense.",
          "Share the problem or code, not a paraphrase of it.",
        ],
      },
      {
        heading: "Peers are often better than experts",
        body: [
          "Someone who learned the material last semester remembers what was confusing about it. Someone who has taught it for a decade has usually forgotten. For a first pass at an unfamiliar topic, a student two years ahead of you is frequently the more useful explanation.",
          "That is the whole idea behind peer mentoring here — mentors are verified SRM AP students who have recently been through the courses you are in now.",
        ],
      },
      {
        heading: "Then return the favour",
        body: [
          "Explaining something to someone else is the most reliable way to find out whether you actually understand it. The first-year who asks you a basic question is doing you a favour, whether or not it feels that way at the time.",
        ],
      },
    ],
    cta: { label: "Find a mentor", to: "/mentors" },
  },
];

export const getBlogPost = (slug: string): BlogPost | undefined =>
  BLOG_POSTS.find((post) => post.slug === slug);

/** Newest first — the order the index renders in. */
export const getSortedBlogPosts = (): BlogPost[] =>
  [...BLOG_POSTS].sort((a, b) => b.date.localeCompare(a.date));

export const formatBlogDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
