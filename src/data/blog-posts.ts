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
    slug: "infinitus-srm-ap-guide",
    title: "Infinitus at SRM AP: What It Is, and How It's Grown Since 2023",
    excerpt:
      "SRM University-AP's biggest fest has gone from a 3,000-person cultural weekend to a 6,000-strong techno-cultural takeover with hackathons, pro-shows, and a car expo. Here's the full history — and how to actually make the most of it.",
    date: "2026-08-21",
    readingMinutes: 6,
    tags: ["Campus Life", "Infinitus", "Events"],
    standfirst:
      "If you've heard seniors talk about 'Infinitus' like it's a whole season rather than an event, they're not exaggerating. Here's what it actually is, how it got here, and how to spend it well instead of just showing up.",
    sections: [
      {
        heading: "What Infinitus actually is",
        body: [
          "Infinitus is SRM University-AP's flagship fest, organised by the Directorate of Student Affairs together with the Student Council. What started as a cultural fest has, since 2024, become a techno-cultural one — pro-show musical headliners and DJ nights running alongside dozens of student competitions in music, dance, theatre, fine arts, gaming and quizzing, plus hackathons, robotics and coding challenges on the technical side.",
          "It usually runs three to four days, pulls in students from other universities as well as SRM AP's own campus, and closes with a headline concert that's become the thing people plan their whole week around.",
        ],
      },
      {
        heading: "How it's grown, year by year",
        body: [
          "The fest has scaled fast enough that each edition looks different from the last:",
        ],
        list: [
          "2023 — The first edition, and the university's first cultural fest in four years. A three-day weekend (April 22–24) inaugurated with a balloon release by Vice Chancellor Prof. Manoj K Arora, headlined by Armaan Malik, Lost Stories, the band Akshar, and DJ Kim, with a Sunburn Campus EDM night. 3,000+ attendees, including students from five-plus neighbouring universities, across 50+ competitions.",
          "2024 — Expanded to four days and rebranded techno-cultural, drawing 6,000+ attendees. Neeti Mohan, Moksha Band, Haricharan, DJ Notorious and stand-up comic Mouli headlined, alongside 30+ food stalls and a luxury automobile expo.",
          "2025 (Feb 5–8) — Salim-Sulaiman, stand-up from Hoody, singer Ram Miryala and DJ Akram on the pro-show side. The technical centrepiece was the HACK SRM Challenge: 22 hours straight, six tracks, a ₹1 lakh prize pool. Chief guest was Mr Kishan Sreenath, VP PowerTrain at Volvo Group.",
          "2026 (Feb 25–28) — The biggest yet: 6,000+ participants, playback singers Karthik and Jonita Gandhi headlining, DJs Gowtham and Ali, 25+ technical competitions spanning hackathons, robotics, coding and VR, 10+ non-technical events, and a car expo alongside it.",
        ],
      },
      {
        heading: "The tech side isn't an afterthought anymore",
        body: [
          "If you only know Infinitus as a concert, the 2025–2026 editions are worth a second look. HACK SRM ran as a genuine 22-hour hackathon with real prize money, and 2026 added drone simulators, VR experiences and expert-led workshops on top of the usual coding and robotics contests. Registration for competitions runs through Unstop, where the 2026 edition alone logged over a thousand sign-ups and close to five lakh impressions across its sub-events — this is no longer a side track to the concerts.",
        ],
      },
      {
        heading: "How to actually make the most of it",
        body: [
          "Pick your technical events early. Slots for things like HACK SRM-style hackathons fill fast, and a strong team beats a solo entry almost every time — this is exactly the kind of thing worth posting about on the community board weeks in advance, not the night before.",
          "Don't skip the smaller stages for the headliner. The quieter competitions — quizzing, fine arts, theatre — are where you're actually competing against people you know, and they're a much easier way to meet people outside your department than the concert crowd.",
          "If you're new to campus: this is the single best weekend of the year to just show up to things. Nobody at Infinitus is checking whether you're 'supposed' to be there.",
        ],
      },
    ],
    cta: { label: "Find your Infinitus team on the community board", to: "/posts" },
  },
  {
    slug: "everything-you-can-do-on-friendly-learning",
    title: "Everything You Can Do on Friendly Learning (It's More Than You Think)",
    excerpt:
      "Most students use one or two features. Here's the full picture — from CampusBrain search and community posts to groups, mentors, faculty, and opportunities.",
    date: "2026-08-07",
    readingMinutes: 7,
    tags: ["Platform Guide", "Getting Started", "CampusBrain"],
    standfirst:
      "You probably landed here to find a mentor or look up a professor. That's a good start. But Friendly Learning is built to take you all the way from 'I have an idea' to 'I have a team' — and most of those tools are sitting unused.",
    sections: [
      {
        heading: "The one-sentence version",
        body: [
          "Friendly Learning is a complete campus ecosystem: post what's on your mind, find the right people using natural-language search, connect with senior mentors and faculty, form a group to coordinate, and discover opportunities — all without leaving campus.",
        ],
      },
      {
        heading: "Community Posts — say what you're looking for",
        body: [
          "The community board is the fastest way to get in front of the whole campus. Post a call for a hackathon teammate with specific skills. Ask whether anyone has taken a particular elective. Announce that you're starting a research project and need a co-author.",
          "A specific post outperforms a vague one every time. 'Looking for a frontend developer for a fintech hackathon this January — I'll handle the pitch and product side' will get you better replies than 'anyone interested in hackathons?'",
        ],
      },
      {
        heading: "CampusBrain — search in plain English",
        body: [
          "The /ask page is the smartest search on campus. You don't need to know a name, a department, or a filter to use it. Type what you're actually looking for — 'someone who knows NLP for a research project' or 'mentor who's done GSoC' — and CampusBrain searches students and faculty together and surfaces the closest matches.",
          "It's the difference between searching a database and describing your problem to a knowledgeable friend. Most people find it in week three and wish they'd found it in week one.",
        ],
      },
      {
        heading: "Mentors — people who've been exactly where you are",
        body: [
          "Every mentor on the platform is a verified SRM AP student who has recently taken the courses you're in now. They remember what was confusing. They know which assignments are actually hard and which just look hard.",
          "Message them directly — not through a form, not by email, just a message. The mentors who consistently help students earn a verified certificate, which means the active ones are genuinely invested in being useful.",
        ],
      },
      {
        heading: "Faculty — the whole directory, searchable by research interest",
        body: [
          "The faculty page carries the complete SRM AP faculty directory, synced from the university's own listings. Every profile shows the professor's research interests and department, so you can find someone whose work matches yours before reaching out.",
          "This is especially useful for elective decisions — reading the profile and student ratings before you register is far more informative than reading the syllabus.",
        ],
      },
      {
        heading: "Groups — from finding to doing",
        body: [
          "Once you've found the right people, create a group. Private groups are for your team: plan the hackathon timeline, share files, coordinate without switching to another app. Public groups are for communities — anyone can join, read, and post.",
          "The pattern that works: post on the board, get replies, move the confirmed team into a private group, and get to work.",
        ],
      },
      {
        heading: "Opportunities — the ones worth knowing about",
        body: [
          "The opportunities page collects hackathons, internships, and research calls posted by students and faculty. The key difference from generic job boards: these are filtered to what's relevant for SRM AP students, and the community posts section lets you find teammates for the ones you want to enter.",
        ],
      },
    ],
    cta: { label: "Try CampusBrain", to: "/ask" },
  },
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
    cta: { label: "Post on the campus board", to: "/posts" },
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
