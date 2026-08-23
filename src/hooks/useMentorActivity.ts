import { useEffect, useState } from "react";

import { getMentorActivity } from "@/integrations/supabase/services/mentors";
import type { MentorActivity } from "@/lib/mentor-activity";

/**
 * Loads a mentor's real reply statistics.
 *
 * `loading` is worth distinguishing from a null result: the profile should not
 * flash "no replies yet" at a mentor with hundreds of them while the RPC is
 * still in flight. Callers render the activity tiles only once loading is done.
 */
export function useMentorActivity(mentorId: string | undefined) {
  const [activity, setActivity] = useState<MentorActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mentorId) {
      setActivity(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getMentorActivity(mentorId).then(({ data, error }) => {
      if (cancelled) return;
      if (error) console.error("mentor_activity", error);
      setActivity(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [mentorId]);

  return { activity, loading };
}
