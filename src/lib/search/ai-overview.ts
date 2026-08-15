/**
 * Intelligent Campus AI Overview Synthesizer
 *
 * Generates concise, accurate, student-friendly campus summaries
 * tailored to the specific department, faculty, and peer mentorship intent.
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

  const totalResults =
    results.mentors.length +
    results.faculty.length +
    results.opportunities.length +
    results.communities.length +
    results.posts.length;

  if (totalResults === 0 && !results.loading) return null;

  const parsed = parseQuery(trimmed);
  const badges: AIEntityBadge[] = [];

  // Filter faculty by detected department if applicable
  const relevantFaculty = results.faculty.filter((f) => {
    if (!parsed.detectedDepartment) return true;
    const dept = (f.subtitle || "").toLowerCase();
    return dept.includes(parsed.detectedDepartment.toLowerCase());
  });

  // Filter mentors by detected department/subject if applicable
  const relevantMentors = results.mentors.filter((m) => {
    if (!parsed.detectedDepartment) return true;
    const combined = `${m.title} ${m.subtitle}`.toLowerCase();
    return (
      combined.includes(parsed.detectedDepartment.toLowerCase()) ||
      parsed.subjectTokens.some((tok) => combined.includes(tok))
    );
  });

  // 1. Gather verified top entity badges
  if (relevantFaculty.length > 0) {
    const topFaculty = relevantFaculty[0];
    badges.push({
      id: topFaculty.id,
      name: topFaculty.title,
      type: "faculty",
      to: topFaculty.to,
      detail: topFaculty.subtitle || "Faculty Guide",
    });

    if (relevantFaculty.length > 1) {
      const secondFaculty = relevantFaculty[1];
      badges.push({
        id: secondFaculty.id,
        name: secondFaculty.title,
        type: "faculty",
        to: secondFaculty.to,
        detail: secondFaculty.subtitle || "Faculty Guide",
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
      detail: topOpp.subtitle || "Open Hackathon",
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

  // 2. Synthesize natural humanized campus summary
  const mentions: string[] = [];
  const insights: string[] = [];
  const topicLabel = parsed.cleanTopic;

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

  if (results.opportunities.length > 0) {
    const o = results.opportunities[0];
    insights.push(`Active opportunity: Check out **${o.title}** to enter or team up with peers.`);
  }

  if (results.communities.length > 0) {
    const c = results.communities[0];
    insights.push(`Workspace group **${c.title}** is active on campus.`);
  }

  if (mentions.length === 0 && insights.length === 0) {
    if (results.posts.length > 0) {
      mentions.push(`Found campus discussions and threads matching **${topicLabel}**.`);
    } else {
      mentions.push(`Here are matching campus resources and contacts for **${topicLabel}**.`);
    }
  }

  const summary = mentions.join(" ");

  // 3. Formulate Action Recommendation
  let actionRecommendation: string | null = null;
  if (parsed.intent === "faculty" && relevantFaculty.length > 0) {
    actionRecommendation = "Tip: Visit faculty profiles to view research tags, publications, and office hours.";
  } else if (parsed.intent === "mentor" && relevantMentors.length > 0) {
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
