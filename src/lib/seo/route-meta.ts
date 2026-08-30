import { APP_NAME, PRIMARY_DOMAIN } from "@/lib/constants";

export interface RouteMeta {
  title: string;
  description: string;
}

/**
 * Title and description for every page that gets pre-rendered.
 *
 * This exists because the pre-rendered HTML could not carry either. Two things
 * stopped it, and both are invisible from inside the app:
 *
 * 1. Every route is `React.lazy`, so during `renderToString` the router
 *    suspends and only the header plus the loading spinner reach the HTML.
 * 2. `SEOHead` writes the title and meta tags from a `useEffect`, and effects
 *    do not run on the server at all.
 *
 * So all thirteen pre-rendered pages shipped byte-identical head tags: the
 * homepage title, the homepage description, the homepage share card. Google
 * runs JavaScript and eventually sees the real ones, but WhatsApp, LinkedIn,
 * Slack and X do not — they read the raw HTML and stop. Every link a student
 * shared, whichever page it pointed at, previewed as the homepage.
 *
 * `prerender.js` reads this map and writes the tags into each page's HTML at
 * build time, which is the only point where the correct values are knowable
 * without running the app. Pages pass the same entries to `SEOHead`, so the
 * client and the crawler cannot disagree.
 *
 * Keys are exact pathnames and must match `routesToPrerender` in prerender.js;
 * that file fails the build if one is missing rather than quietly emitting the
 * homepage tags again.
 */
export const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: `${APP_NAME} - CampusBrain AI Search for SRM AP | Peer Mentors, Faculty & Groups`,
    // Deliberately not APP_DESCRIPTION, which is a shorter blurb used elsewhere.
    // This is the wording index.html already served to crawlers.
    description:
      "Ask CampusBrain anything about SRM AP \u2014 find peer mentors, faculty by research area, hackathon teammates, and groups in one search. Friendly Learning SRMAP is the free, all-in-one campus platform for SRM AP students.",
  },
  "/about": {
    title:
      "About Friendly Learning SRMAP - University Student Collaboration Platform | Find Study Partners & Hackathon Teams",
    description:
      "Learn about Friendly Learning SRMAP's mission to connect university students for academic help, hackathon partnerships, project collaborations, startup discussions, and finding study partners. Discover how our platform builds stronger university communities.",
  },
  "/mentors": {
    // The page's own title counts the mentors currently listed, which is not
    // knowable at build time. This is the same sentence without the count; the
    // live one replaces it on mount.
    title: "Find Student Mentors at Friendly Learning SRM AP | Browse Verified SRMAP Mentors",
    description:
      "Discover experienced student mentors at Friendly Learning SRM AP University in Amaravati. Browse profiles, skills, and reviews to find the perfect mentor for your academic journey. Connect with verified peer mentors from SRMAP today!",
  },
  "/posts": {
    title: "Posts | Campus Discussions & Peer Help at SRM AP | Friendly Learning SRMAP",
    description:
      "Browse and share student posts at SRM University-AP. Ask for academic help, find study partners, form hackathon teams, and post campus discussions.",
  },
  "/faculty": {
    title: "Faculty Directory & Ratings | SRM University-AP | Friendly Learning SRMAP",
    description:
      "Browse SRM AP faculty profiles, research areas, student ratings, and course reviews across all departments at SRM University-AP.",
  },
  "/contact": {
    title: "Contact Friendly Learning - Get Support for SRM AP Mentorship Platform",
    description:
      "Have questions about Friendly Learning? Contact our support team for help with mentor connections, platform features, or technical support. We're here to help SRM AP students succeed!",
  },
  "/events": {
    title:
      "University Events & Workshops at SRM AP | Friendly Learning SRMAP | Campus Activities",
    description:
      "Discover upcoming university events, workshops, guest lectures, hackathons, and campus activities at SRM University-AP. Stay updated and register directly.",
  },
  "/workspace-groups": {
    title:
      "Workspace Groups | SRM AP Student Collaboration & Projects | Friendly Learning SRMAP",
    description:
      "Join student workspace groups and project teams at SRM University-AP. Collaborate on course projects, hackathons, and research with peers.",
  },
  "/how-it-works": {
    title: "How Friendly Learning SRMAP Works | University Student Collaboration Guide",
    description:
      "Learn how Friendly Learning SRMAP helps SRM AP students find mentors, rate faculty, form hackathon teams, join groups, and collaborate \u2014 all from one campus platform. Simple 3-step process to start.",
  },
  "/find-study-partners": {
    title:
      "Find Study Partners at SRM AP | Friendly Learning SRMAP Campus Platform",
    description:
      "Connect with study partners at SRM University-AP through Friendly Learning SRMAP. Find students in your courses, form study groups, and improve academic performance together.",
  },
  "/hackathon-partners": {
    title:
      "Find Hackathon Partners & Build Winning Teams at SRM AP | Friendly Learning SRMAP",
    description:
      "Connect with skilled developers, designers, and business minds for hackathon teams at SRM University-AP through Friendly Learning SRMAP. Build winning teams with complementary skills for coding competitions and innovation challenges.",
  },
  "/opportunities": {
    title: "Hackathons & Opportunities at SRM AP | Find a Team",
    description:
      "Hackathons, competitions and internships open to SRM University-AP students — and the teammates to enter them with. See who else is interested, start a team, and get a group chat.",
  },
  "/ask": {
    title: "Who Can Help? | Find SRM AP Faculty and Senior Mentors by Topic",
    description:
      "Describe what you're working on or stuck on, and find the SRM University-AP faculty who research it and the seniors who've already done it — in one answer.",
  },
  "/blog": {
    title: "Blog | Friendly Learning SRMAP",
    description:
      "Practical guides for SRM AP students — choosing electives with faculty ratings, finding hackathon teammates who show up, and asking for academic help early.",
  },

  // These three render no SEOHead at all, so until now they had no description
  // of their own anywhere — client-side or otherwise.
  "/signup": {
    title: "Sign Up | Friendly Learning SRMAP",
    description:
      "Create a free Friendly Learning SRMAP account to find mentors, join study groups, and connect with other SRM AP students. Open to every SRM AP student.",
  },
  "/signin": {
    title: "Sign In | Friendly Learning SRMAP",
    description:
      "Sign in to Friendly Learning SRMAP to message mentors, follow your groups, and pick up conversations where you left off.",
  },
  "/become-mentor": {
    title: "Become a Mentor | Friendly Learning SRMAP",
    description:
      "Help juniors at SRM AP with the things you have already been through — courses, hackathons, interviews, electives. Set your own pace, and pause whenever you need to.",
  },
  "/how-verification-works": {
    title: "How Verification Works | Friendly Learning SRMAP",
    description:
      "How mentor applications, College ID checks, and mentor certificates actually work on Friendly Learning SRMAP — in plain language, verified against the code that runs them.",
  },
  "/your-data": {
    title: "Your Data | Friendly Learning SRMAP",
    description:
      "What Friendly Learning SRMAP stores, what's public versus private, and how to ask for your data to be removed.",
  },
  "/attendance": {
    title: "Course Attendance Tracker | Friendly Learning SRMAP",
    description:
      "Track live course attendance from the SRM AP student portal, monitor 75% examination eligibility thresholds, and plan upcoming classes.",
  },
};

/** Absolute URL for a pre-rendered route, used for canonical and og:url. */
export const canonicalFor = (route: string): string =>
  route === "/" ? `${PRIMARY_DOMAIN}/` : `${PRIMARY_DOMAIN}${route}`;
