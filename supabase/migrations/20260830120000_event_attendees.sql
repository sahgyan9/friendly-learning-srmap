-- =============================================================================
-- Event Attendees & Peer Attendance Coordination ("Who's Going")
--
-- Enables students to RSVP to campus events ("going" / "interested"), attach an
-- optional note/icebreaker, view other attendees, and coordinate directly.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.event_attendees (
  event_id BIGINT NOT NULL REFERENCES public.srmap_events_cache(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested')),
  note TEXT CHECK (length(note) <= 150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON public.event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON public.event_attendees (user_id);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "Authenticated users can view event attendees" ON public.event_attendees;
CREATE POLICY "Authenticated users can view event attendees"
  ON public.event_attendees FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Public can view event attendees" ON public.event_attendees;
CREATE POLICY "Public can view event attendees"
  ON public.event_attendees FOR SELECT
  TO anon
  USING (true);

-- Mutation policies (students manage only their own attendance row)
DROP POLICY IF EXISTS "Users can insert their own event attendance" ON public.event_attendees;
CREATE POLICY "Users can insert their own event attendance"
  ON public.event_attendees FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own event attendance" ON public.event_attendees;
CREATE POLICY "Users can update their own event attendance"
  ON public.event_attendees FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own event attendance" ON public.event_attendees;
CREATE POLICY "Users can delete their own event attendance"
  ON public.event_attendees FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendees TO authenticated;
GRANT SELECT ON public.event_attendees TO anon;

-- -----------------------------------------------------------------------------
-- RPC: get_event_attendees
--
-- SECURITY DEFINER so that public user profile information (name, avatar,
-- department, mentor badge) can be joined cleanly without exposing the raw
-- public.users table directly to anon.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_event_attendees(p_event_id BIGINT)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  profile_image TEXT,
  department TEXT,
  role TEXT,
  is_mentor BOOLEAN,
  status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    ea.user_id,
    COALESCE(u.name, 'Student') AS name,
    u.profile_image,
    u.department,
    u.role,
    EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = ea.user_id AND m.department <> 'General') AS is_mentor,
    ea.status,
    ea.note,
    ea.created_at
  FROM public.event_attendees ea
  LEFT JOIN public.users u ON u.id = ea.user_id
  WHERE ea.event_id = p_event_id
  ORDER BY ea.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_attendees(BIGINT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- RPC: get_event_attendance_counts
-- Returns counts of going and interested attendees per event.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_event_attendance_counts(p_event_ids BIGINT[])
RETURNS TABLE (
  event_id BIGINT,
  going_count BIGINT,
  interested_count BIGINT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    ea.event_id,
    COUNT(*) FILTER (WHERE ea.status = 'going') AS going_count,
    COUNT(*) FILTER (WHERE ea.status = 'interested') AS interested_count,
    COUNT(*) AS total_count
  FROM public.event_attendees ea
  WHERE ea.event_id = ANY(p_event_ids)
  GROUP BY ea.event_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_attendance_counts(BIGINT[]) TO anon, authenticated;
