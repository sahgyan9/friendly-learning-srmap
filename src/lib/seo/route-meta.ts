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
    title: `${APP_NAME} - Student Mentorship Platform | SRM AP Academic Mentors`,
    // Deliberately not APP_DESCRIPTION, which is a shorter blurb used elsewhere.
    // This is the wording index.html already served to crawlers.
    description:
      "Friendly Learning SRMAP connects SRM AP university students with experienced peer mentors for academic guidance, project collaboration, and study partnerships. Get personalized help from verified mentors in your department.",
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
  "/community-posts": {
    title: "Posts | Find Hackathon Partners & Study Help at SRM AP",
    description:
      "Post and browse requests from SRM AP students — hackathon teammates, study help, project collaborators, research partners and campus announcements.",
  },
  "/contact": {
    title: "Contact Friendly Learning - Get Support for SRM AP Mentorship Platform",
    description:
      "Have questions about Friendly Learning? Contact our support team for help with mentor connections, platform features, or technical support. We're here to help SRM AP students succeed!",
  },
  "/marketplace": {
    title:
      "Events & News | Friendly Learning SRMAP University Student Hub | Find University Events, News & Advertisements",
    description:
      "Discover university events, news, advertisements, and course materials at Friendly Learning SRMAP. Stay updated with campus activities, announcements, and educational resources for university students.",
  },
  "/how-it-works": {
    title: "How Friendly Learning SRMAP Works | University Student Collaboration Guide",
    description:
      "Learn how Friendly Learning SRMAP connects university students worldwide for mentoring, study partnerships, hackathon teams, and academic collaboration. Simple 3-step process to start collaborating.",
  },
  "/find-study-partners": {
    title:
      "Find Study Partners at Your University | Friendly Learning SRMAP Student Collaboration Platform",
    description:
      "Connect with study partners at your university through Friendly Learning SRMAP. Find students in your courses, form study groups, and improve academic performance together. University student networking made easy.",
  },
  "/hackathon-partners": {
    title:
      "Find Hackathon Partners & Build Winning Teams | Friendly Learning SRMAP University Platform",
    description:
      "Connect with skilled developers, designers, and business minds for hackathon teams through Friendly Learning SRMAP. Build winning teams with complementary skills at your university. Perfect team formation for coding competitions.",
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
};

/** Absolute URL for a pre-rendered route, used for canonical and og:url. */
export const canonicalFor = (route: string): string =>
  route === "/" ? `${PRIMARY_DOMAIN}/` : `${PRIMARY_DOMAIN}${route}`;
