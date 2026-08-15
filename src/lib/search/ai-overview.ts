/**
 * Intelligent Multi-Archetype Campus AI Overview Synthesizer
 *
 * Generates actionable, student-friendly AI summaries tailored to:
 * 1. Informational & Stage Guides (Freshers, Electives, How-To, Advice)
 * 2. Domain & Research Specializations (Physics, ML, Quantum, etc.)
 * 3. Exact Entity Lookups (Specific Faculty & Mentors)
 * 4. Hackathons & Collaboration
 */

import type { SearchResultsState } from "@/hooks/useSearchResults";
import { parseQuery } from "@/lib/search/query-engine";

export interface AIEntityBadge {
  id: string;
  name: string;
  type: "faculty" | "mentor" | "opportunity" | "community" | "post";
  to: string;
  detail: string;
}

export interface AIOverviewResult {
  summary: string;
  keyInsights: string[];
  badges: AIEntityBadge[];
  actionRecommendation: string | null;
}

export function generateCampusAIOverview(
  query: string,
  results: SearchResultsState,
): AIOverviewResult | null {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return null;

  const parsed = parseQuery(trimmed);
  const badges: AIEntityBadge[] = [];
  const insights: string[] = [];

  // ─── ARCHETYPE 1: Informational & Guide Queries ────────────────────────────
  if (parsed.intent === "informational") {
    let summary = "";
    let actionRecommendation: string | null = null;

    if (parsed.infoTopic === "fresher_guide" || parsed.infoTopic === "faculty_contact") {
      summary =
        "As a 1st-year student at SRM-AP seeking academic & faculty guidance: " +
        "1. **Check Faculty Office Hours** — professors maintain weekly drop-in consultation slots. " +
        "2. **Email Formally** — use your `@srmap.edu.in` email with your roll number, section, and specific questions. " +
        "3. **Connect with Senior Mentors** — seniors who recently took your 1st-year courses can share study notes, exam tips, and practical advice.";

      badges.push({
        id: "guide-academic-help",
        name: "Guide: Asking for Academic Help",
        type: "post",
        to: "/blog/asking-for-academic-help",
        detail: "5 min read · Practical Advice",
      });

      badges.push({
        id: "guide-platform-overview",
        name: "Guide: Everything on Friendly Learning",
        type: "post",
        to: "/blog/everything-you-can-do-on-friendly-learning",
        detail: "7 min read · Getting Started",
      });

      if (results.faculty.length > 0) {
        badges.push({
          id: "faculty-directory",
          name: "Faculty Directory & Ratings",
          type: "faculty",
          to: "/faculty",
          detail: "Browse SRM-AP Faculty Profiles",
        });
      }

      insights.push("Pro tip: Reach out in the first 3 weeks rather than waiting until exam time.");
      insights.push("Check student reviews for teaching quality and helpfulness on faculty profiles.");
      actionRecommendation = "Tip: Include your roll number and course code when reaching out to professors.";
    } else if (parsed.infoTopic === "electives") {
      summary =
        "When choosing electives at SRM-AP: " +
        "1. **Check Teaching Quality & Grading Fairness** — read anonymous student reviews on the faculty directory before registering. " +
        "2. **Ask Seniors** — post on the campus board to find out how assignments are weighted and what the exams feel like.";

      badges.push({
        id: "guide-electives",
        name: "Guide: Choosing Electives Without Guessing",
        type: "post",
        to: "/blog/choosing-electives-srm-ap",
        detail: "6 min read · Registration Tips",
      });

      badges.push({
        id: "browse-faculty",
        name: "Browse Faculty Ratings",
        type: "faculty",
        to: "/faculty",
        detail: "Anonymous Student Reviews",
      });

      actionRecommendation = "Tip: Weigh grading fairness and teaching style according to whether it's a core or elective course.";
    } else if (parsed.infoTopic === "hackathon_prep") {
      summary =
        "To find hackathon teammates who follow through: " +
        "1. **Be specific** — state what you're building, the skills needed, and the time commitment. " +
        "2. **Post 3 weeks early** on the campus board. " +
        "3. **Mix skills** across backend, frontend/design, and pitch presentation.";

      badges.push({
        id: "guide-hackathons",
        name: "Guide: Finding Hackathon Teammates",
        type: "post",
        to: "/blog/finding-hackathon-teammates",
        detail: "5 min read · Team Building",
      });

      if (results.opportunities.length > 0) {
        const topOpp = results.opportunities[0];
        badges.push({
          id: topOpp.id,
          name: topOpp.title,
          type: "opportunity",
          to: topOpp.to,
          detail: topOpp.subtitle || "Open Hackathon",
        });
      }

      actionRecommendation = "Tip: A specific project post gets 5x higher quality responses than 'DM me for hackathon'.";
    } else {
      summary =
        "For academic support and guidance at SRM-AP, you can connect directly with verified senior mentors who completed your courses, or browse faculty research profiles for project supervision.";

      badges.push({
        id: "guide-academic-help",
        name: "Guide: Asking for Academic Help",
        type: "post",
        to: "/blog/asking-for-academic-help",
        detail: "5 min read · Mentorship Tips",
      });

      actionRecommendation = "Tip: Browse senior mentors or ask questions on the community board.";
    }

    return {
      summary,
      keyInsights: insights,
      badges,
      actionRecommendation,
    };
  }

  // ─── ARCHETYPE 2: Domain, Entity & Exploration Queries ────────────────────

  const totalResults =
    results.mentors.length +
    results.faculty.length +
    results.opportunities.length +
    results.communities.length +
    results.posts.length;

  if (totalResults === 0 && !results.loading) return null;

  // Filter faculty by detected department
  const relevantFaculty = results.faculty.filter((f) => {
    if (!parsed.detectedDepartment) return true;
    const dept = (f.subtitle || "").toLowerCase();
    return dept.includes(parsed.detectedDepartment.toLowerCase());
  });

  // Filter mentors by detected department / skill
  const relevantMentors = results.mentors.filter((m) => {
    if (!parsed.detectedDepartment) return true;
    const combined = `${m.title} ${m.subtitle}`.toLowerCase();
    return (
      combined.includes(parsed.detectedDepartment.toLowerCase()) ||
      parsed.subjectTokens.some((tok) => combined.includes(tok))
    );
  });

  // 1. Entity Badges
  if (relevantFaculty.length > 0) {
    const f1 = relevantFaculty[0];
    badges.push({
      id: f1.id,
      name: f1.title,
      type: "faculty",
      to: f1.to,
      detail: f1.subtitle || "Faculty Guide",
    });

    if (relevantFaculty.length > 1) {
      const f2 = relevantFaculty[1];
      badges.push({
        id: f2.id,
        name: f2.title,
        type: "faculty",
        to: f2.to,
        detail: f2.subtitle || "Faculty Guide",
      });
    }
  }

  if (relevantMentors.length > 0) {
    const topMentor = relevantMentors[0];
    badges.push({
      id: topMentor.id,
      name: topMentor.title,
      type: "mentor",
      to: topMentor.to,
      detail: topMentor.subtitle || "Senior Mentor",
    });
  }

  if (results.opportunities.length > 0) {
    const topOpp = results.opportunities[0];
    badges.push({
      id: topOpp.id,
      name: topOpp.title,
      type: "opportunity",
      to: topOpp.to,
      detail: topOpp.subtitle || "Open Competition",
    });
  }

  if (results.communities.length > 0) {
    const topGroup = results.communities[0];
    badges.push({
      id: topGroup.id,
      name: topGroup.title,
      type: "community",
      to: topGroup.to,
      detail: topGroup.subtitle || "Campus Group",
    });
  }

  // 2. Dynamic Synthesis
  const mentions: string[] = [];
  const topicLabel = parsed.cleanTopic;

  // Direct entity lookup: person search
  if (parsed.intent === "entity_lookup") {
    if (relevantFaculty.length > 0 && parsed.nameTokens.some((tok) => relevantFaculty[0].title.toLowerCase().includes(tok))) {
      const f = relevantFaculty[0];
      mentions.push(
        `**${f.title}** is a faculty member at SRM-AP (${f.subtitle}). Visit their profile to explore research specializations, student ratings, and consultation hours.`,
      );
    } else if (relevantMentors.length > 0 && parsed.nameTokens.some((tok) => relevantMentors[0].title.toLowerCase().includes(tok))) {
      const m = relevantMentors[0];
      mentions.push(
        `**${m.title}** is a senior student mentor at SRM-AP (${m.subtitle}). Message them directly for coursework advice, project tips, and peer guidance.`,
      );
    }
  }

  if (mentions.length === 0) {
    if (relevantFaculty.length > 0 && relevantMentors.length > 0) {
      const f = relevantFaculty[0];
      const m = relevantMentors[0];
      mentions.push(
        `For **${topicLabel}**, you can reach out to faculty members like **${f.title}** (${f.subtitle}) for academic mentorship and research guidance, or connect with senior mentors like **${m.title}** (${m.subtitle}) for peer support.`,
      );
    } else if (relevantFaculty.length > 0) {
      const f1 = relevantFaculty[0];
      if (relevantFaculty.length > 1) {
        const f2 = relevantFaculty[1];
        mentions.push(
          `For **${topicLabel}**, top-rated faculty at SRM-AP include **${f1.title}** (${f1.subtitle}) and **${f2.title}** (${f2.subtitle}). Check their profiles to view research interests and connect.`,
        );
      } else {
        mentions.push(
          `For **${topicLabel}**, **${f1.title}** (${f1.subtitle}) is a key faculty member to contact for project mentoring and coursework guidance.`,
        );
      }
    } else if (relevantMentors.length > 0) {
      const m = relevantMentors[0];
      mentions.push(
        `Senior mentors like **${m.title}** (${m.subtitle}) have verified experience in **${topicLabel}** and are available to help you.`,
      );
    }
  }

  if (results.opportunities.length > 0) {
    const o = results.opportunities[0];
    insights.push(`Active opportunity: Check out **${o.title}** to enter or team up with peers.`);
  }

  if (mentions.length === 0) {
    if (results.posts.length > 0) {
      mentions.push(`Found campus discussions and threads matching **${topicLabel}**.`);
    } else {
      mentions.push(`Here are matching campus resources and contacts for **${topicLabel}**.`);
    }
  }

  const summary = mentions.join(" ");

  // 3. Action Recommendation
  let actionRecommendation: string | null = null;
  if (relevantFaculty.length > 0) {
    actionRecommendation = "Tip: Visit faculty profiles to view research tags, publications, and office hours.";
  } else if (relevantMentors.length > 0) {
    actionRecommendation = "Tip: Send a direct mentorship request to ask about courses and project advice.";
  } else if (results.opportunities.length > 0) {
    actionRecommendation = "Tip: Check registration deadlines and connect with potential teammates.";
  }

  return {
    summary,
    keyInsights: insights,
    badges,
    actionRecommendation,
  };
}
