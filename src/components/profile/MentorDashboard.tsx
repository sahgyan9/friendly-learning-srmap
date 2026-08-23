import { useEffect, useState } from "react";
import { Eye, MessageCircle, Search, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";

import {
  getMentorDashboardStats,
  type MentorDashboardStats,
} from "@/integrations/supabase/services/mentors";
import {
  MIN_REPLIES_FOR_SPEED,
  MIN_REQUESTS_FOR_RATE,
  replyRate,
  replySpeed,
} from "@/lib/mentor-activity";

/**
 * "How am I doing?" for the mentor themselves.
 *
 * Two rules this panel exists to follow, both learned from the fabricated stats
 * that used to sit on the public profile:
 *
 *   1. Never show a number we have not measured. Where there is not enough data
 *      for a rate to mean anything, this says so in words instead of printing a
 *      precise-looking percentage derived from two data points.
 *   2. Never show a rate without the visibility beside it. "0 requests" reads as
 *      failure on its own; next to "3 people viewed your profile" it reads as
 *      what it is, which is not enough traffic yet to tell.
 */
export default function MentorDashboard({ mentorId }: { mentorId: string }) {
  const [stats, setStats] = useState<MentorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getMentorDashboardStats().then(({ data }) => {
      if (cancelled) return;
      setStats(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [mentorId]);

  if (loading) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </section>
    );
  }

  if (!stats) return null;

  const views = stats.profile_views_30d;
  const prevViews = stats.profile_views_prev30;
  const rate = replyRate(stats);
  const speed = replySpeed(stats);
  const unanswered = Math.max(0, stats.requests_received - stats.requests_answered);

  // Only claim a trend when there is a previous period to compare against.
  // "Up 100%" from zero to one view is noise dressed as a signal.
  const trend =
    prevViews > 0 && views !== prevViews
      ? Math.round(((views - prevViews) / prevViews) * 100)
      : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Your mentoring activity</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Last 30 days. Only you can see this.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={<Eye className="h-4 w-4" />}
          value={String(views)}
          label={views === 1 ? "Profile view" : "Profile views"}
          note={
            trend === null
              ? undefined
              : `${trend > 0 ? "+" : ""}${trend}% vs previous 30 days`
          }
        />
        <Stat
          icon={<Search className="h-4 w-4" />}
          value={String(stats.search_clicks_30d)}
          label={stats.search_clicks_30d === 1 ? "Found via search" : "Found via search"}
        />
        <Stat
          icon={<MessageCircle className="h-4 w-4" />}
          value={String(stats.requests_received)}
          label={stats.requests_received === 1 ? "Student reached out" : "Students reached out"}
        />
        <Stat
          icon={<Users className="h-4 w-4" />}
          value={String(stats.students_helped)}
          label={stats.students_helped === 1 ? "Student helped" : "Students helped"}
        />
      </div>

      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {/* Reply quality, in words when the sample is too small for a number. */}
        {rate !== null ? (
          <p className="text-sm text-foreground">
            You reply to <strong>{rate}%</strong> of the students who message you
            {speed ? (
              <>
                , usually within <strong>{speed.replace(/^(About|Under) /, "").toLowerCase()}</strong>
              </>
            ) : null}
            .
          </p>
        ) : stats.requests_received > 0 ? (
          <p className="text-sm text-muted-foreground">
            {stats.requests_received} student{stats.requests_received === 1 ? " has" : "s have"}{" "}
            messaged you so far — too few to show a reply rate yet. It appears on your
            profile once {MIN_REQUESTS_FOR_RATE} people have.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nobody has messaged you yet.{" "}
            {views > 0
              ? `${views} ${views === 1 ? "person has" : "people have"} looked at your profile, so you are being seen.`
              : "You are not getting much traffic yet."}
          </p>
        )}

        {unanswered > 0 && (
          <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
            {unanswered} {unanswered === 1 ? "student is" : "students are"} still waiting on a
            reply.{" "}
            <Link to="/chat" className="underline underline-offset-2">
              Open messages
            </Link>
          </p>
        )}

        {rate !== null && speed === null && stats.requests_answered > 0 && (
          <p className="text-xs text-muted-foreground">
            Your typical reply time shows on your profile after{" "}
            {MIN_REPLIES_FOR_SPEED} replies.
          </p>
        )}

        {views === 0 && stats.search_clicks_30d === 0 && (
          <p className="text-xs text-muted-foreground">
            A fuller profile — a specific bio, your projects, the topics you can help with —
            is what makes you turn up in search.{" "}
            <Link
              to={`/mentor/${mentorId}`}
              className="font-medium text-primary underline underline-offset-2"
            >
              View your profile
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}

function Stat({
  icon,
  value,
  label,
  note,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="mb-1 text-muted-foreground">{icon}</div>
      <p className="text-xl font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {note && <p className="mt-1 text-2xs text-muted-foreground/80">{note}</p>}
    </div>
  );
}
