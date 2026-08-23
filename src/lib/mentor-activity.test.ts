import { describe, expect, it } from "vitest";

import {
  activityRecency,
  isNewMentor,
  recencyLabel,
  replyRate,
  replySpeed,
  type MentorActivity,
} from "./mentor-activity";

const activity = (over: Partial<MentorActivity> = {}): MentorActivity => ({
  students_helped: 0,
  requests_received: 0,
  requests_answered: 0,
  median_reply_minutes: null,
  last_message_at: null,
  ...over,
});

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe("reply rate", () => {
  it("is withheld below the confidence floor", () => {
    // One missed message is not a 0% response rate, and publishing it as one
    // would be the same overclaiming as the "91%" this replaced.
    expect(replyRate(activity({ requests_received: 1, requests_answered: 0 }))).toBeNull();
    expect(replyRate(activity({ requests_received: 2, requests_answered: 2 }))).toBeNull();
  });

  it("reports the real rate once there is enough to divide", () => {
    expect(replyRate(activity({ requests_received: 4, requests_answered: 3 }))).toBe(75);
  });

  it("does not round a genuinely poor rate up into a flattering one", () => {
    expect(replyRate(activity({ requests_received: 10, requests_answered: 1 }))).toBe(10);
  });

  it("reports a perfect rate as 100, not as a hedge", () => {
    expect(replyRate(activity({ requests_received: 5, requests_answered: 5 }))).toBe(100);
  });
});

describe("reply speed", () => {
  it("is withheld until a median means something", () => {
    expect(
      replySpeed(activity({ requests_answered: 2, median_reply_minutes: 12 })),
    ).toBeNull();
  });

  it("is withheld when there is no measurement at all", () => {
    expect(
      replySpeed(activity({ requests_answered: 9, median_reply_minutes: null })),
    ).toBeNull();
  });

  it("describes sub-hour, hourly and multi-day turnarounds distinctly", () => {
    expect(replySpeed(activity({ requests_answered: 5, median_reply_minutes: 20 })))
      .toBe("Under an hour");
    expect(replySpeed(activity({ requests_answered: 5, median_reply_minutes: 200 })))
      .toBe("About 3 hours");
    expect(replySpeed(activity({ requests_answered: 5, median_reply_minutes: 2880 })))
      .toBe("About 2 days");
  });

  it("singularises so it never reads 'About 1 hours'", () => {
    expect(replySpeed(activity({ requests_answered: 5, median_reply_minutes: 60 })))
      .toBe("About 1 hour");
    expect(replySpeed(activity({ requests_answered: 5, median_reply_minutes: 1440 })))
      .toBe("About 1 day");
  });
});

describe("activity recency", () => {
  it("distinguishes this week from this month", () => {
    expect(activityRecency(daysAgo(2))).toBe("week");
    expect(activityRecency(daysAgo(20))).toBe("month");
  });

  it("goes quiet rather than labelling someone dormant", () => {
    expect(activityRecency(daysAgo(90))).toBe("quiet");
    expect(recencyLabel(activityRecency(daysAgo(90)))).toBeNull();
  });

  it("treats a mentor who has never messaged as quiet, not as active", () => {
    // The bug this replaces: a hardcoded green "Active" badge on every profile.
    expect(activityRecency(null)).toBe("quiet");
    expect(recencyLabel(activityRecency(null))).toBeNull();
  });

  it("does not read a future timestamp as freshly active", () => {
    expect(activityRecency(daysAgo(-5))).toBe("quiet");
  });
});

describe("new mentor", () => {
  it("is true when nobody has messaged them, whatever else is set", () => {
    expect(isNewMentor(activity({ students_helped: 0, requests_received: 0 }))).toBe(true);
    expect(isNewMentor(null)).toBe(true);
  });

  it("is false as soon as a single request exists", () => {
    expect(isNewMentor(activity({ requests_received: 1 }))).toBe(false);
  });
});
