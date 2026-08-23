/**
 * Real mentor reply statistics, and the rules for when they are worth showing.
 *
 * This replaces the constants that used to sit in mentor-enhancements.ts --
 * "91% response rate", "Replies within 3 hours", "12+ Mentees Mentored" -- which
 * were printed identically on every profile on the site, including mentors who
 * had never had a single conversation.
 *
 * The thresholds below matter as much as the numbers. A mentor with one request
 * who missed it is not a "0% response rate"; that is one data point wearing a
 * statistic's clothing, and publishing it would be its own kind of dishonesty.
 * Below the floor we show nothing rather than something shaky.
 */

export interface MentorActivity {
  students_helped: number;
  requests_received: number;
  requests_answered: number;
  median_reply_minutes: number | null;
  last_message_at: string | null;
}

/** Below this many requests, a reply rate is an anecdote, not a rate. */
export const MIN_REQUESTS_FOR_RATE = 3;

/** Below this many answered requests, a median is one or two conversations. */
export const MIN_REPLIES_FOR_SPEED = 3;

const DAY_MS = 86_400_000;

export type ActivityRecency = "week" | "month" | "quiet";

/**
 * How recently the mentor last said anything.
 *
 * "quiet" deliberately renders as no badge at all rather than a negative one.
 * The goal is to stop overstating, not to start shaming people who are busy
 * with exams -- and a mentor who paused their listing has already told us why.
 */
export function activityRecency(lastMessageAt: string | null): ActivityRecency {
  if (!lastMessageAt) return "quiet";
  const age = Date.now() - new Date(lastMessageAt).getTime();
  if (age < 0 || age > 30 * DAY_MS) return "quiet";
  return age <= 7 * DAY_MS ? "week" : "month";
}

export function recencyLabel(recency: ActivityRecency): string | null {
  if (recency === "week") return "Active this week";
  if (recency === "month") return "Active this month";
  return null;
}

/** Whole-percent reply rate, or null when there is not enough to divide. */
export function replyRate(activity: MentorActivity): number | null {
  if (activity.requests_received < MIN_REQUESTS_FOR_RATE) return null;
  return Math.round((activity.requests_answered / activity.requests_received) * 100);
}

/** Short human turnaround, or null when too few replies to be a median. */
export function replySpeed(activity: MentorActivity): string | null {
  const mins = activity.median_reply_minutes;
  if (mins === null || activity.requests_answered < MIN_REPLIES_FOR_SPEED) return null;
  if (mins < 60) return "Under an hour";
  if (mins < 24 * 60) {
    const hours = Math.round(mins / 60);
    return `About ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(mins / (24 * 60));
  return `About ${days} day${days === 1 ? "" : "s"}`;
}

/**
 * True when the mentor has no track record yet.
 *
 * Worth saying out loud on the profile: "no replies yet" is a fair thing for a
 * student to know, and it is far better for the new mentor than an invented
 * 91% that sets an expectation they never agreed to.
 */
export function isNewMentor(activity: MentorActivity | null): boolean {
  return !activity || activity.requests_received === 0;
}
