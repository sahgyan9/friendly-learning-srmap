-- Fix infinite recursion in canvas_participants RLS policies
-- The issue is that the SELECT policy references itself, causing infinite recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view participants in sessions they're part of" ON canvas_participants;
DROP POLICY IF EXISTS "Participants can view session participants" ON canvas_participants;

-- Create a simpler, non-recursive policy for viewing participants
-- Users can see participants if they are the mentor of the session OR if they are themselves a participant
CREATE POLICY "Users can view session participants"
ON canvas_participants FOR SELECT
TO authenticated
USING (
    -- User is the mentor of this session
    EXISTS (
        SELECT 1 FROM canvas_sessions 
        WHERE canvas_sessions.id = canvas_participants.session_id 
        AND canvas_sessions.mentor_id = auth.uid()
    )
    OR
    -- User is viewing their own participation record
    user_id = auth.uid()
);

-- Fix canvas_sessions SELECT policy to be more permissive
DROP POLICY IF EXISTS "Users can view active sessions" ON canvas_sessions;
DROP POLICY IF EXISTS "Users can view canvas sessions they participate in" ON canvas_sessions;

CREATE POLICY "Users can view canvas sessions"
ON canvas_sessions FOR SELECT
TO authenticated
USING (
    -- User is the mentor
    mentor_id = auth.uid()
    OR
    -- User is a participant in this session
    EXISTS (
        SELECT 1 FROM canvas_participants 
        WHERE canvas_participants.session_id = canvas_sessions.id 
        AND canvas_participants.user_id = auth.uid()
    )
    OR
    -- Session is active (for joining via code)
    is_active = true
);

-- Fix canvas_drawings policies
DROP POLICY IF EXISTS "Participants can view session drawings" ON canvas_drawings;
DROP POLICY IF EXISTS "Users can view drawings in sessions they participate in" ON canvas_drawings;

CREATE POLICY "Users can view canvas drawings"
ON canvas_drawings FOR SELECT
TO authenticated
USING (
    -- User is the creator of the session
    EXISTS (
        SELECT 1 FROM canvas_sessions 
        WHERE canvas_sessions.id = canvas_drawings.session_id 
        AND canvas_sessions.mentor_id = auth.uid()
    )
    OR
    -- User is a participant
    EXISTS (
        SELECT 1 FROM canvas_participants 
        WHERE canvas_participants.session_id = canvas_drawings.session_id 
        AND canvas_participants.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Participants can create drawings" ON canvas_drawings;
DROP POLICY IF EXISTS "Participants can add drawings" ON canvas_drawings;

CREATE POLICY "Participants can create drawings"
ON canvas_drawings FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);